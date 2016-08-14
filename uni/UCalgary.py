"""
Copyright (c) 2016 Stepan Fedorko-Bartos, Ceegan Hale

Under MIT License - https://github.com/Step7750/ScheduleStorm/blob/master/LICENSE.md

This file is a resource for Schedule Storm - https://github.com/Step7750/ScheduleStorm
"""

import threading
import requests
from bs4 import BeautifulSoup
import re
import pymongo
import json
from bson import json_util
import time
import logging


log = logging.getLogger("UCalgary")

# Only for testing purposes in order to debug HTTPS network traffic
requests.packages.urllib3.disable_warnings()
verifyRequests = False


class UCalgary(threading.Thread):

    # Maps the term season to its respective id
    termIDMap = {
        "Winter": 1,
        "Spring": 3,
        "Summer": 5,
        "Fall": 7
    }

    # List of terms currently available on the site
    terms = []

    class CourseDescriptions(threading.Thread):
        """
        Mines course descriptions from the U of C public site given the subject
        """

        mainpage = "http://www.ucalgary.ca/pubs/calendar/current/"
        fullname = ""  # full name of the subject (CPSC = Computer Science)

        def __init__(self, subject):
            """
            Constructor for retrieving course descriptions

            :param subject: **string** Subject code to retrieve course descriptions for
            :return:
            """

            threading.Thread.__init__(self)
            self.db = pymongo.MongoClient().ScheduleStorm
            self.subject = subject

        def run(self):
            log.info("Getting course descriptions for " + self.subject)

            obtained = False
            while not obtained:
                coursedescs = False

                # Get the list of the urls for each subject
                try:
                    coursedescs = requests.get(self.mainpage + "course-desc-main.html")
                except Exception as e:
                    log.critical('There was an error while obtaining course descriptions for ' +
                                 self.subject + " | " + str(e))


                if coursedescs and coursedescs.status_code == requests.codes.ok \
                        and "Course Descriptions" in coursedescs.text:
                    # Request was successful, parse it

                    obtained = True

                    # Parse the HTML of the listings
                    soup = BeautifulSoup(coursedescs.text)

                    # Find the subject url on the page
                    for link in soup.find("table", {"id": "ctl00_ctl00_pageContent"}).findAll("a", {"class": "link-text"}):
                        # Subject 4 letter code
                        suffix = link.text.strip().split(" ")[-1]

                        # We found the subject, get it's descriptions
                        if suffix == self.subject:
                            log.debug("Found the course description url for " + self.subject)

                            # Get the full name of the subject (CPSC = Computer Science)
                            self.fullname = link.text.strip().split(" ")
                            self.fullname = " ".join(self.fullname[0:len(self.fullname)-1])

                            # Get the course descriptions
                            self.getCoursePage(link["href"])
                            break
                else:
                    # The request was unsuccessful, wait until the next attempt
                    time.sleep(60)

        def getCoursePage(self, link):
            """
            Obtains the courses page for the subject and updates the DB info for the subject's properties

            :param link: **string** Link to the course descriptions for this subject
            :return:
            """
            obtained = False

            while not obtained:
                r = requests.get(self.mainpage + link)

                if r.status_code == requests.codes.ok:
                    obtained = True

                    soup = BeautifulSoup(r.text)

                    header = soup.find("span", {"id": "ctl00_ctl00_pageContent_ctl01_ctl02_cnBody", "class": "generic-body"})

                    index = 0

                    instructioninfo = ""
                    notes = ""

                    for child in header.findAll(recursive=False):
                        if index == 0:
                            instructioninfo = child.text
                        else:
                            notes += child.text.strip() + "\n"
                        index += 1

                    notes = notes.replace("Notes:\n", "").strip()

                    # Make sure the details of this subject is known to the db
                    subjectdict = {
                        "subject": self.subject,
                        "name": self.fullname,
                        "notes": notes,
                        "instruction": instructioninfo
                    }

                    # Update the subject data in the DB
                    self.db.UCalgarySubjects.update(
                        {"subject": subjectdict["subject"]},
                        {
                            "$set": subjectdict,
                            "$currentDate": {"lastModified": True}
                        },
                        upsert=True
                    )

                    log.debug("Updated DB subject for " + self.subject)

                    # Iterate the course divs on the page
                    for course in soup.findAll("table", {"bordercolor": "#000000", "bgcolor": "white", "align": "center", "width": "100%"}):
                        self.parseCourse(course)

                else:
                    log.error("Failed to obtain course descriptions for " + self.subject + ", trying again in 10s")
                    time.sleep(10)

        def parseCourse(self, course):
            """
            Parses the HTML div of a course description and updates it in the DB

            :param course: **string** HTML of the course DIV to parse
            """

            # Maps the HTML elements to the dictionary keys
            courseProperties = {
                "coursenum": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnCode'),
                "name": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnTitle'),
                "desc": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnDescription'),
                "hours": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnHours'),
                "prereq": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnPrerequisites'),
                "coreq": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnCorequisites'),
                "antireq": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnAntirequisites'),
                "notes": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnNotes'),
                "aka": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnAKA'),
                "repeat": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnRepeat'),
                "nogpa": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnNoGpa')
            }

            coursedata = {}

            for property in courseProperties:

                # Get the data of the element
                data = course.find("span", {"id": courseProperties[property]}).text.strip()

                if data:
                    if property == "nogpa" or property == 'repeat':
                        coursedata[property] = True
                    elif property == "hours":
                        if ";" in data:
                            unitval = data.split(";")[0].replace("units", "").replace("unit", "").strip()

                            # Try to convert it to a float
                            try:
                                coursedata["units"] = float(unitval)
                            except:
                                coursedata["units"] = unitval

                            coursedata["hours"] = data.split(";")[1].strip()
                        else:
                            coursedata[property] = data
                    else:
                        coursedata[property] = data


            coursedata["subject"] = self.subject

            # Upsert the course into the DB
            self.db.UCalgaryCourseDesc.update(
                        {"coursenum": coursedata["coursenum"], "subject": coursedata["subject"]},
                        {
                            "$set": coursedata,
                            "$currentDate": {"lastModified": True}
                        },
                        upsert=True
                    )

    def __init__(self, settings):
        # UCalgary doesn't have a public directory for course info, we have to login with a student account
        threading.Thread.__init__(self)
        self.settings = settings
        self.loginSession = requests.session()

        self.db = pymongo.MongoClient().ScheduleStorm

    def login(self):
        """
        Logs into MyUofC given the account specified in settings

        NOTE: Due to the lack of HTTP status codes on MyUofC, we have to see the text of the DOM as to whether the
        login was successful. The strings may change in the future, which will cause the bot to continually fail to login

        :return: **boolean** Defines whether we successfully logged in or not
        """

        log.info("Logging into MyUofC")

        payload = {"username": self.settings["username"],
                   "password": self.settings["password"],
                   "lt": "ScheduleStorm",
                   "Login": "Sign+In"}

        r = self.loginSession.post("https://cas.ucalgary.ca/cas/login?service="
                                   "https://my.ucalgary.ca/psp/paprd/?cmd=start&ca.ucalgary.authent.ucid=true",
                                   data=payload,
                                   verify=verifyRequests)

        # UCalgary has improper HTTP status codes, we can't use them (200 for invalid login etc...)
        # We'll have to scan the text to see whether we logged in or not
        if "invalid username or password" not in r.text:
            # Parse the form data
            payload = self.getHiddenInputPayload(r.text)


            r = self.loginSession.post("https://my.ucalgary.ca/psp/paprd/?cmd=start", data=payload, verify=verifyRequests)

            if "My class schedule" in r.text:
                # We probably logged in, it's hard to tell without HTTP status codes
                log.info("Successfully logged into MyUofC")
                return True
            else:
                return False
        else:
            log.error("Invalid Username or Password to MyUofC")
            return False

    def getHiddenInputPayload(self, text):
        """
        Given a U of C page, this will extract the inputs that are "hidden" and return their values

        :param text: **string** HTML of a UCalgary page with hidden input fields
        :return: **dict** Contains the names and values of the hidden inputs (called the "payload" for each request)
        """

        soup = BeautifulSoup(text)

        payload = {}

        # We want to put all of the input fields that are "hidden" into a dict and send it over to the next request
        for hiddenfield in soup.findAll("input", {"type": "hidden"}):
            # Add this field
            if hiddenfield["name"] in payload:
                # This item is already in the dict, add this new value to the list
                if isinstance(payload[hiddenfield["name"]], list):
                    # Just append to the list
                    payload[hiddenfield["name"]].append(hiddenfield["value"])
                else:
                    # Make a new list
                    curval = payload[hiddenfield["name"]]
                    payload[hiddenfield["name"]] = [curval, hiddenfield["value"]]
            else:
                payload[hiddenfield["name"]] = hiddenfield["value"]

        return payload

    def scrapeTerms(self):
        """
        MUST BE LOGGED IN

        Retrieves a list of available terms to retrieve class data for

        :return: **list** List of terms if the request was successful, False is not
        """
        r = self.loginSession.get("https://csprd.ucalgary.ca/psc/csprd/STUDENT/CAMPUS/c/"
                                  "SA_LEARNER_SERVICES.SSR_SSENRL_CART.GBL?Page=SSR_SSENRL_CART&"
                                  "Action=A&ACAD_CAREER=CAR&EMPLID=" + self.settings["ucid"] +
                                  "&ENRL_REQUEST_ID=&INSTITUTION=INST&STRM=TERM",
                                  verify=verifyRequests,
                                  allow_redirects=False)

        if r.status_code == requests.codes.ok:
            termlist = self.parseTerms(r.text)

            return termlist
        else:
            # We didn't receive the term list
            return False

    def parseTerms(self, text):
        """
        Returns list of terms on a term page

        :param text: **string** HTML of the UCalgary term page
        :return: **list** available terms on the page
        """
        soup = BeautifulSoup(text)
        termlist = []
        for term in soup.findAll("span", {"id": re.compile('TERM_CAR\$\d*')}):
            termlist.append(term.text)

        return termlist

    def termNameToID(self, termname):
        """
        Given the term name, returns the id (ex. Winter 2017 = 2171)

        :param termname: **string** Name of the term (ex. Winter 2017)
        :return: **string** Term ID
        """
        splitname = termname.split(" ")
        id = ""

        # If the year is 2016, this creates 216
        id += splitname[1][0] + splitname[1][2:4]

        if splitname[0] in self.termIDMap:
            # We have a mapping for this season
            id += str(self.termIDMap[splitname[0]])
            return id
        else:
            # We don't have a mapping for this season
            return False

    def termIDToName(self, termname):
        """
        Given the term id, returns the name (ex. 2171 = Winter 2017)

        :param termname: **string/int** ID of the term (ex. 2171)
        :return: **string** Name of the term
        """
        termname = str(termname)

        year = termname[0] + "0" + termname[1:3]

        season = ""

        for termseason in self.termIDMap:
            if int(termname[3]) == self.termIDMap[termseason]:
                season = termseason
                break

        return season + " " + year

    def getTermCourses(self, termid):
        """
        Gets the available courses for the specified term and calls to obtain the classes for each one

        :param termid: **string/int** Term ID to get courses for
        :return:
        """
        log.info("Getting courses for " + str(termid))

        # Set the current term
        r = self.loginSession.get("https://csprd.ucalgary.ca/psc/csprd/EMPLOYEE/CAMPUS/c/"
                                  "SA_LEARNER_SERVICES.SSR_SSENRL_CART.GBL?Page=SSR_SSENRL_CART"
                                  "&Action=A&ACAD_CAREER=UGRD&EMPLID=" + self.settings["ucid"] + "&INSTITUTION=UCALG&"
                                  "STRM=" + termid +"&TargetFrameName=None", verify=verifyRequests)

        # We want the search course page now
        payload = self.getHiddenInputPayload(r.text)

        # Magic values
        payload["ICAction"] = "DERIVED_REGFRM1_SSR_PB_SRCH"
        payload["DERIVED_SSTSNAV_SSTS_MAIN_GOTO$7$"] = 9999
        payload["DERIVED_REGFRM1_CLASS_NBR"] = ""
        payload["DERIVED_REGFRM1_SSR_CLS_SRCH_TYPE$249$"] = "06"
        payload["DERIVED_SSTSNAV_SSTS_MAIN_GOTO$8$"] = 9999

        # Do the call
        subjectlistpage = self.loginSession.post("https://csprd.ucalgary.ca/psc/csprd/EMPLOYEE/CAMPUS/c/"
                                                "SA_LEARNER_SERVICES.SSR_SSENRL_CART.GBL", data=payload, verify=verifyRequests)


        subjectlist = []
        # We now want the subject list for this term
        soup = BeautifulSoup(subjectlistpage.text)

        for subject in soup.find("select", {"id": "SSR_CLSRCH_WRK_SUBJECT_SRCH$0"}).findAll("option"):
            if subject["value"] != "":
                # Don't want to include the first whitespace option
                subjectlist.append(subject.text)

        log.debug(str(subjectlist))

        # Get the most recent payload
        payload = self.getHiddenInputPayload(subjectlistpage.text)

        for subject in subjectlist:
            # obtain the courses for this subject
            gotData = False

            while not gotData:
                try:
                    self.getSubjectCourses(subject, termid, payload)
                    gotData = True
                except requests.exceptions.Timeout:
                    log.error("Request timed out for " + subject)
                    gotData = False

        log.info("Finished parsing the term courses for " + str(termid))

    def getSubjectCourses(self, subject, termid, payload):
        """
        Gets and processes the courses for the given subject and termid

        :param subject: **string** Subject to obtain courses for
        :param termid: **int/string** ID of the term to obtain courses for
        :param payload: **dict** Hidden inputs of the previous page
        :return:
        """
        subjectid = subject.split("-")[0] # id, aka abbreviation

        # We want all of the classesfor this subject and since there is a 250 return limit, we request on a subject
        # by subject basis (and get around the >2 search parameters constraint)
        payload["ICAction"] = "CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH"
        payload["SSR_CLSRCH_WRK_SUBJECT_SRCH$0"] = subjectid
        payload["SSR_CLSRCH_WRK_SSR_EXACT_MATCH1$1"] = "C"
        payload["SSR_CLSRCH_WRK_CATALOG_NBR$1"] = ""
        payload["SSR_CLSRCH_WRK_ACAD_CAREER$2"] = ""
        payload["SSR_CLSRCH_WRK_SSR_OPEN_ONLY$chk$3"] = "N"
        payload["SSR_CLSRCH_WRK_OEE_IND$chk$4"] = "N"
        payload["SSR_CLSRCH_WRK_SSR_START_TIME_OPR$5"] = "GE"
        payload["SSR_CLSRCH_WRK_MEETING_TIME_START$5"] = ""
        payload["SSR_CLSRCH_WRK_SSR_END_TIME_OPR$5"] = "LE"
        payload["SSR_CLSRCH_WRK_MEETING_TIME_END$5"] = ""
        payload["SSR_CLSRCH_WRK_INCLUDE_CLASS_DAYS$6"] = "J"
        payload["SSR_CLSRCH_WRK_MON$chk$6"] = "Y"
        payload["SSR_CLSRCH_WRK_MON$6"] = "Y"
        payload["SSR_CLSRCH_WRK_TUES$chk$6"] = "Y"
        payload["SSR_CLSRCH_WRK_TUES$6"] = "Y"
        payload["SSR_CLSRCH_WRK_WED$chk$6"] = "Y"
        payload["SSR_CLSRCH_WRK_WED$6"] = "Y"
        payload["SSR_CLSRCH_WRK_THURS$chk$6"] = "Y"
        payload["SSR_CLSRCH_WRK_THURS$6"] = "Y"
        payload["SSR_CLSRCH_WRK_FRI$chk$6"] = "Y"
        payload["SSR_CLSRCH_WRK_FRI$6"] = "Y"
        payload["SSR_CLSRCH_WRK_SAT$chk$6"] = "Y"
        payload["SSR_CLSRCH_WRK_SAT$6"] = "Y"
        payload["SSR_CLSRCH_WRK_SUN$chk$6"] = "Y"
        payload["SSR_CLSRCH_WRK_SUN$6"] = "Y"
        payload["SSR_CLSRCH_WRK_SSR_EXACT_MATCH2$7"] = "B"
        payload["SSR_CLSRCH_WRK_LAST_NAME$7"] = ""
        payload["SSR_CLSRCH_WRK_CLASS_NBR$8"] = ""
        payload["SSR_CLSRCH_WRK_DESCR$9"] = ""
        payload["SSR_CLSRCH_WRK_SSR_UNITS_MIN_OPR$10"] = "GE"
        payload["SSR_CLSRCH_WRK_UNITS_MINIMUM$10"] = ""
        payload["SSR_CLSRCH_WRK_SSR_UNITS_MAX_OPR$10"] = "LE"
        payload["SSR_CLSRCH_WRK_UNITS_MAXIMUM$10"] = ""
        payload["SSR_CLSRCH_WRK_SSR_COMPONENT$11"] = ""
        payload["SSR_CLSRCH_WRK_SESSION_CODE$12"] = ""
        payload["SSR_CLSRCH_WRK_INSTRUCTION_MODE$13"] = ""
        payload["SSR_CLSRCH_WRK_CAMPUS$14"] = ""

        log.info("Retrieving data for " + subjectid)

        #Make the following an empty string if you want other locations like Qatar, Red Deer
        # Make it "MAIN" for only the u of c campus
        payload["SSR_CLSRCH_WRK_LOCATION$15"] = ""
        payload["DERIVED_SSTSNAV_SSTS_MAIN_GOTO$8$"] = 9999
        payload["DERIVED_SSTSNAV_SSTS_MAIN_GOTO$7$"] = 9999

        # Get the courselist
        courselist = self.loginSession.post("https://csprd.ucalgary.ca/psc/csprd/EMPLOYEE/"
                                          "CAMPUS/c/SA_LEARNER_SERVICES.SSR_SSENRL_CART.GBL", data=payload,
                                                     verify=verifyRequests, timeout=30)

        if "search will return over 50 classes" in courselist.text:
            # Want to continue
            payload = self.getHiddenInputPayload(courselist.text)
            payload["ICAction"] = "#ICSave"

            courselist = self.loginSession.post("https://csprd.ucalgary.ca/psc/csprd/EMPLOYEE/"
                                          "CAMPUS/c/SA_LEARNER_SERVICES.SSR_SSENRL_CART.GBL", data=payload, verify=verifyRequests,
                                                timeout=40)



        if "Your search will exceed the maximum limit" in courselist.text:
            # This should not happen, if means we couldn't retrieve these courses
            log.error("Too many courses for " + subjectid)
        elif "The search returns no results that match the criteria specified" in courselist.text:
            log.error("No courses for " + subjectid)
        else:
            # We probably have the data we want
            self.parseRawCourseList(courselist.text, subjectid, termid)

    def parseRawCourseList(self, courselist, subjectid, termid):
        """
        Parses the raw HTML of the course list and upsets each course in the DB
        :param courselist: **string** HTML of the course list page
        :param subjectid: **string** Subject that this course list is for
        :param termid: **int/string** Term of this course list
        :return:
        """

        soup = BeautifulSoup(courselist)

        # If true, we are already obtaining descriptions for this subject, no need to make another thread
        obtainingDescriptions = False

        # Iterate through the courses
        for course in soup.findAll("div", {"id": re.compile('win0divSSR_CLSRSLT_WRK_GROUPBOX2\$\d*')}):
            coursename = course.find("div", {"id": re.compile('win0divSSR_CLSRSLT_WRK_GROUPBOX2GP\$\d*')}).text.strip()

            subid = coursename.split("  ")[0]  # Subject ID

            if subid != subjectid:
                # We didn't receive the data we want, this shouldn't be happening
                log.error("Incorrect subject data returned for " + subjectid + " while parsing " + str(termid) + ": " +
                    subid)

            splitname = coursename.split(" - ")
            coursenum = splitname[0].split("  ")[1]  # Course number
            descname = " ".join(splitname[1:]).strip()  # Short description of the course

            # Find the possible classes in this course
            for classdiv in course.findAll("table", {"id": re.compile('ACE_SSR_CLSRSLT_WRK_GROUPBOX3\$\d*')}):

                classid = classdiv.find("div", {"id": re.compile('win0divMTG_CLASSNAME\$\d*')}).text.strip()

                scheduletype = " ".join(classid.split(" ")[1:])  # Regular, LabWeek, etc...

                type = classid.split(" ")[0].split("-")[1]  # Lab, Lec etc...

                # Figure out if there are class restrictions
                restriction = False
                restrictiondiv = classdiv.find("div", {"id": re.compile('win0divUCSS_E010_WRK_HTMLAREA\$\d*')})

                if restrictiondiv.find("img"):
                    # There is a restriction on this class
                    restriction = True


                # Construct the upsert obj with the other properties
                classdict = {
                    "subject": subjectid,
                    "type": type,
                    "scheduletype": scheduletype.strip(),
                    "coursenum": coursenum,
                    "id": int(classdiv.find("div", {"id": re.compile('win0divMTG_CLASS_NBR\$\d*')}).text.strip()),
                    "term": int(termid),
                    "times": classdiv.find("div", {"id": re.compile('win0divMTG_DAYTIME\$\d*')}).text.strip().split("\r"),
                    "location": classdiv.find("div", {"id": re.compile('win0divUCSS_E010_WRK_DESCR\$\d*')}).text.strip(),
                    "rooms": classdiv.find("div", {"id": re.compile('win0divMTG_ROOM\$\d*')}).text.strip().split("\r"),
                    "teachers": classdiv.find("div", {"id": re.compile('win0divMTG_INSTR\$\d*')}).text.strip().split("\r"),
                    "group": classdiv.find("div", {"id": re.compile('win0divUCSS_E010_WRK_ASSOCIATED_CLASS\$\d*')}).text.strip(),
                    "status": classdiv.find("div", {"id": re.compile('win0divDERIVED_CLSRCH_SSR_STATUS_LONG\$\d*')}).find("img")["alt"],
                    "restriction": restriction
                }

                # Add in potential class notes
                notes = classdiv.find("div", {"id": re.compile('win0divDERIVED_CLSRCH_DESCRLONG\$\d*')}).text.strip('\xa0')

                if len(notes) > 1:
                    classdict["notes"] = notes.strip()

                # Remove whitespace and commas from teacher names
                for teacher in range(len(classdict["teachers"])):
                    classdict["teachers"][teacher] = classdict["teachers"][teacher].strip(", ").strip()

                # Upsert the object
                self.db.UCalgaryCourseList.update(
                    {"id": classdict["id"], "term": classdict["term"]},
                    {
                        "$set": classdict,
                        "$currentDate": {"lastModified": True}
                    },
                    upsert=True
                )

                # Check if this subject is in the course descriptions db or not, if not, make it
                if not obtainingDescriptions:
                    # Check if this is already in the db
                    result = self.db.UCalgaryCourseDesc.find_one({"coursenum": coursenum, "subject": subjectid,
                                                                  "units": {"$exists": True}})

                    if not result:
                        # There is no description for this course
                        obtainingDescriptions = True
                        threadm = self.CourseDescriptions(subjectid)
                        threadm.setDaemon(True)
                        threadm.start()


                # Now we want to update the course name in the UCalgaryCourseDesc db,
                # some courses don't have a description, at least they'll have a name
                # Usually this is due to a suffix onto the course number

                classdesc = {
                    "subject": subjectid,
                    "name": descname,
                    "coursenum": coursenum
                }

                # Upsert the data
                self.db.UCalgaryCourseDesc.update(
                    {"coursenum": classdesc["coursenum"], "subject": classdesc["subject"]},
                    {
                        "$set": classdesc,
                        "$currentDate": {"lastModified": True}
                    },
                    upsert=True
                )

    def getTerms(self):
        """
        API Handler

        Returns the distinct terms in the database, along with their name and id
        :return: **dict** Keys are the ids, values are the proper names
        """
        termlist = self.db.UCalgaryCourseList.distinct("term")
        responsedict = {}

        for term in termlist:
            responsedict[str(term)] = self.termIDToName(term)

        return responsedict

    def getSubjectList(self, term):
        """
        API Handler

        Returns a list of all subjects for a given term

        :param term: **string/int** Term id to retrieve subjects for
        :return: **dict** Contains every subject and course for this term
        """
        responsedict = {}

        # Get distinct subjects for this term
        subjectlist = self.db.UCalgaryCourseList.distinct("subject", {"term": int(term)})

        for subject in subjectlist:
            # Get the courses for this subject
            responsedict[subject] = self.db.UCalgaryCourseList.distinct("coursenum", {"term": int(term), "subject": subject})

        return responsedict

    def retrieveCourseDesc(self, courses):
        """
        Given a course list from an API handler, retrieves course descriptions and sorts by faculty

        Pure Function

        :param courses: **dict** List of courses from API handler
        :return: **dict** Faculty sorted dict with course descriptions
        """
        facultydict = {}

        # Get the descriptions for each subject
        for subject in courses:
            result = self.db.UCalgarySubjects.find_one({"subject": subject})

            if result:
                del result["_id"]
                del result["subject"]
                del result["lastModified"]

                if "faculty" not in result:
                    result["faculty"] = "Other"

                if result["faculty"] not in facultydict:
                    facultydict[result["faculty"]] = {}

                facultydict[result["faculty"]][subject] = courses[subject]

                facultydict[result["faculty"]][subject]["description"] = result

        return facultydict

    def matchRMPNames(self, distinctteachers):
        """
        Given a list of teachers to match RMP data to, this function obtains all RMP data and tries to match the names
        with the distinctteachers list and returns the matches

        We first check whether the constructed name is simply the same in RMP
        If not, we check whether the first and last words in a name in RMP is the same
        If not, we check whether any first and last words in the teachers name has a result in RMP that starts
            with the first and last words
        If not, we give up and don't process the words

        Most teachers should have a valid match using this method, many simply don't have a profile on RMP
        Around 80%+ of valid teachers on RMP should get a match

        False positives are possible, but highly unlikely given that it requires the first and last name of the
        wrong person to start the same way

        :param distinctteachers: **list** Distinct list of all teachers to find an RMP match for
        :return: **dict** Matched teachers and their RMP ratings
        """
        # Get the RMP data for all teachers at UCalgary
        rmp = self.db.RateMyProfessors.find({"school": self.settings["rmpid"]})

        returnobj = {}

        # We want to construct the names of each teacher and invert the results for easier parsing
        # and better time complexity
        rmpinverted = {}

        for teacher in rmp:
            # Construct the name
            fullname = ""
            if "firstname" in teacher:
                fullname += teacher["firstname"]
            if "middlename" in teacher:
                fullname += " " + teacher["middlename"]
            if "lastname" in teacher:
                fullname += " " + teacher["lastname"]

            # remove unnecessary fields
            del teacher["_id"]
            del teacher["lastModified"]
            del teacher["school"]

            rmpinverted[fullname] = teacher

        # Iterate through each distinct teacher
        for teacher in distinctteachers:
            if teacher in rmpinverted:
                # We found an instant match, add it to the return dict
                returnobj[teacher] = rmpinverted[teacher]
            else:
                # Find the first and last words of the name
                teacherNameSplit = teacher.split(" ")
                lastword = teacherNameSplit[-1]
                firstword = teacherNameSplit[0]

                # Check to see if the first and last words find a match (without a middle name)
                namewithoutmiddle = firstword + " " + lastword

                if namewithoutmiddle in rmpinverted:
                    # Found the match! Add an alias field
                    returnobj[teacher] = rmpinverted[namewithoutmiddle]
                else:
                    # Find a teacher in RMP that had the first and last words of their name starting the
                    # respective words in the original teacher's name
                    for teacher2 in rmpinverted:
                        splitname = teacher2.split(" ")
                        first = splitname[0]
                        last = splitname[-1]

                        if lastword.startswith(last) and firstword.startswith(first):
                            returnobj[teacher] = rmpinverted[teacher2]
                            break

        return returnobj

    def getSubjectListAll(self, term):
        """
        API Handler

        Returns all data for a given term (classes, descriptions and RMP)

        :param term: **string/int** ID of the term
        :return: **dict** All data for the term
        """
        responsedict = {}

        classes = self.db.UCalgaryCourseList.find({"term": int(term)})
        distinctteachers = []

        # Parse each class and get their descriptions
        for classv in classes:
            del classv["_id"]

            if classv["subject"] not in responsedict:
                responsedict[classv["subject"]] = {}

            if classv["coursenum"] not in responsedict[classv["subject"]]:
                responsedict[classv["subject"]][classv["coursenum"]] = {"classes": []}

            subj = classv["subject"]
            coursen = classv["coursenum"]

            # Get the class description
            if "description" not in responsedict[subj][coursen]:
                result = self.db.UCalgaryCourseDesc.find_one({"coursenum": coursen, "subject": subj})

                if result:
                    if "units" not in result:
                        # We didn't get a course with full description
                        # The course list might have had a discrepancy, let's try to
                        # find a course with the same underlying number

                        # remove alpha characters and periods, maybe the cleaner version has a description
                        cleancoursen = re.compile(r'\D\d*').sub('', coursen)

                        cleanresult = self.db.UCalgaryCourseDesc.find_one({"coursenum": cleancoursen, "subject": subj,
                                                                  "units": {"$exists": True}})

                        # Got it!
                        if cleanresult:
                            result = cleanresult
                        else:
                            pass

                    # Remove unneeded fields
                    del result["_id"]
                    del result["subject"]
                    del result["coursenum"]
                    del result["lastModified"]

                    responsedict[subj][coursen]["description"] = result
                else:
                    responsedict[subj][coursen]["description"] = False

            # Remove unneeded fields
            del classv["subject"]
            del classv["coursenum"]
            del classv["lastModified"]

            # Add this class to the course list
            responsedict[subj][coursen]["classes"].append(classv)

            # Find distinct teachers and append them to distinctteachers
            for teacher in classv["teachers"]:
                if teacher not in distinctteachers and teacher != "Staff":
                    distinctteachers.append(teacher)


        # Add the faculty sorting and course descriptions
        responsedict = self.retrieveCourseDesc(responsedict)

        # Match RMP data
        rmpobj = self.matchRMPNames(distinctteachers)

        # Send over a list of all the professors with a RMP rating in the list
        return {"classes": responsedict, "rmp": rmpobj}

        # If we don't want PPrint
        #return json.dumps({"classes": responsedict, "rmp": rmpobj}, default=json_util.default)

    def getCourseDescriptions(self):
        """
        API Handler

        Returns the description of every course at UCalgary
        :return: **dict** Description of every course at UCalgary
        """
        responsedict = {}

        # Get the courses
        courses = self.db.UCalgaryCourseDesc.find()

        for classv in courses:
            # Remove unnecessary fields
            del classv["_id"]
            del classv["lastModified"]

            # If the key for this subject is not in the dict, add it
            if classv["subject"] not in responsedict:
                responsedict[classv["subject"]] = {}

            responsedict[classv["subject"]][classv["coursenum"]] = classv

        return responsedict

    def getSubjectDesc(self):
        """
        API Handler

        Returns the description of every subject at UCalgary

        :return: **dict** Description of every subject at UCalgary
        """
        responsedict = {}
        subjects = self.db.UCalgarySubjects.find()

        for subject in subjects:
            del subject["_id"]
            del subject["lastModified"]

            responsedict[subject["subject"]] = subject
        return responsedict

    def updateFaculties(self):
        # Get the list
        log.info("Getting faculty list")

        # Get faculty list
        r = requests.get("http://www.ucalgary.ca/pubs/calendar/current/course-by-faculty.html")

        if r.status_code == requests.codes.ok:
            # Make BS obj
            soup = BeautifulSoup(r.text)

            # Iterate through each faculty
            for faculty in soup.findAll("span", {"id": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnTitle')}):
                log.debug(faculty.text)

                # Get the faculty body
                body = faculty.parent.find("span", {"id": re.compile('ctl00_ctl00_pageContent_ctl\d*_ctl\d*_cnBody')})

                # Replace <br> with newlines
                for br in body.find_all("br"):
                    br.replace_with("\n")

                # Obtain each subject
                subjects = body.find("p").text.split("\n")

                for subject in subjects:
                    # Strip the subject name
                    subject = subject.strip()
                    if len(subject) > 1 and " " in subject:
                        subjectcode = subject.strip().split(" ")[-1]  # 3 or 4 letter subject code

                        # Make sure the code length is proper
                        if len(subjectcode) > 1:
                            subjectdict = {
                                "subject": subjectcode,
                                "faculty": faculty.text.strip()
                            }

                            # upsert into the DB
                            self.db.UCalgarySubjects.update(
                                {"subject": subjectdict["subject"]},
                                {
                                    "$set": subjectdict,
                                    "$currentDate": {"lastModified": True}
                                },
                                upsert=True
                            )

        log.info("Updated faculty list")

    def run(self):
        """
        Scraping thread that obtains updated course info

        :return:
        """

        if self.settings["scrape"]:
            while True:
                try:
                    # Update the faculties
                    self.updateFaculties()

                    # Login to U of C
                    if self.login():
                        # Get the terms
                        self.terms = self.scrapeTerms()

                        if self.terms:
                            # For each term, get the courses
                            for term in self.terms:
                                log.info("Obtaining " + str(term) + " course data with an id of "
                                         + str(self.termNameToID(term)))
                                self.getTermCourses(self.termNameToID(term))
                except Exception as e:
                    log.critical("There was an critical exception in UCalgary  | " + str(e))

                # Sleep for the specified interval
                time.sleep(self.settings["scrapeinterval"])
        else:
            log.info("Scraping is disabled")
