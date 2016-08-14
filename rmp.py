"""
Copyright (c) 2016 Stepan Fedorko-Bartos, Ceegan Hale

Under MIT License - https://github.com/Step7750/ScheduleStorm/blob/master/LICENSE.md

This file is a resource for Schedule Storm - https://github.com/Step7750/ScheduleStorm
"""

import threading
import requests
import pymongo
import time
import logging

log = logging.getLogger("RMP")

class RateMyProfessors(threading.Thread):
    def __init__(self, rmpids, interval):
        """
        Constructor for RateMyProfessors to set the RMP schools to request and the interval

        :param rmpids: **list** List of rmp ids to scrape for
        :param interval: **int** Seconds to wait in between scraping
        :return:
        """
        threading.Thread.__init__(self)
        # Pass in a list that contains the the ids to fetch
        self.ids = rmpids

        # The amount of seconds to wait before scraping RMP again
        self.interval = interval

        # Establish db connection
        self.db = pymongo.MongoClient().ScheduleStorm

    def getRatingsForSchool(self, schoolid):
        """
        Returns the JSON for teacher ratings for the specified school id

        :param schoolid: **int** RMP ID that defines this school (should be in it's settings)
        :return: **dict** Teacher ratings for schoolid
        """

        log.info("Obtaining RMP data for " + str(schoolid))

        apiurl = "http://search.mtvnservices.com/typeahead/suggest/" \
              "?q=*%3A*+AND+schoolid_s%3A" + str(schoolid) + \
              "&defType=edismax" \
              "&qf=teacherfullname_t%5E1000+autosuggest" \
              "&sort=total_number_of_ratings_i+desc" \
              "&siteName=rmp" \
              "&rows=999999" \
              "&start=0" \
              "&fl=pk_id+teacherfirstname_t+teacherlastname_t+total_number_of_ratings_i+averageratingscore_rf+" \
              "teachermiddlename_t+teacherdepartment_s+averageeasyscore_rf"

        obtained = False


        while not obtained:
            # Get the data
            r = False

            try:
                r = requests.get(apiurl)
            except Exception as e:
                log.critical("There was an exception while retrieving RMP data for " + str(schoolid) + " | " + str(e))

            if r and r.status_code == requests.codes.ok:
                # We got the data we wanted
                obtained = True

                # Parse it
                jsonval = r.json()

                # Make sure it has the properties we want
                if "response" in jsonval and "docs" in jsonval["response"]:
                    return jsonval["response"]["docs"]
                else:
                    return False

            else:
                # We didn't get a successful response, try again in 1min
                time.sleep(60)

    def upsertTeachers(self, teachers, schoolid):
        """
        Upserts the teachers from schoolid into the db

        :param teachers: **dict** RMP teacher response dict (response from getRatingsForSchool)
        :param schoolid: **int** RMP ID that defines this school (should be in it's settings)
        :return:
        """

        for teacher in teachers:
            if "averageratingscore_rf" in teacher:
                # We only want to insert them if they actually have a rating

                # We want to remap the dict keys for the DB
                mapkeys = {
                    "pk_id": "id",
                    "averageratingscore_rf": "rating",
                    "total_number_of_ratings_i": "numratings",
                    "teacherfirstname_t": "firstname",
                    "teachermiddlename_t": "middlename",
                    "teacherlastname_t": "lastname",
                    "teacherdepartment_s": "department",
                    "averageeasyscore_rf": "easyrating"
                }

                # Object to upsert
                upsertobj = {}

                # Iterate through the teacher and process the keys
                for key in teacher:
                    if key in mapkeys:
                        # Convert the appropriate keys
                        upsertobj[mapkeys[key]] = teacher[key]

                        if "name" in key:
                            upsertobj[mapkeys[key]] = upsertobj[mapkeys[key]].strip()

                upsertobj["school"] = schoolid

                self.db.RateMyProfessors.update\
                        (
                            {"id": upsertobj["id"]},
                            {
                                "$set": upsertobj,
                                "$currentDate": {"lastModified": True}
                            },
                            upsert=True
                        )

        log.info("Finished adding data to DB for " + str(schoolid))

    def run(self):
        if self.interval and self.interval > 0:
            while True:

                # Iterate through the ids and update the RMP ratings
                for id in self.ids:
                    try:
                        rmpdata = self.getRatingsForSchool(id)

                        if rmpdata:
                            self.upsertTeachers(rmpdata, id)
                    except Exception as e:
                        log.critical("There was an error while obtaining and parsing RMP data for"
                                     + str(id) + " | " + str(e))

                time.sleep(self.interval)
