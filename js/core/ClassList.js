"use strict";

class ClassList {
    constructor(uni, term) {
        this.baseURL = "http://api.schedulestorm.com:5000/v1/";
        this.detailKeys = ["prereq", "coreq", "antireq", "notes"];
        this.uni = uni;
        this.term = term;
        this.location = null;
        window.term = term;
        window.uni = uni;

        // we want to save the term and uni in localStorage
        localStorage.setItem('uni', uni);
        localStorage.setItem('term', term);

        this.searchFound = []; // Array that sorts search results by order of importance

        $("#searchcourses").unbind(); // unbind search if there is a bind
        $("#searchcourses").val('');

        this.createTermDropdown();
        this.createLocationDropdown();
        this.getClasses();

        // bind the scroll tooltip destroy event
        this.bindTooltipScrollDestroy();
    }
    
    /*
        Removes all divs for tooltips in the body container
    */
    removeAllBodyTooltips() {
        // Remove any open tooltip div
        $('[role=tooltip]').each(function () {
            $(this).remove();
        });
    }

    /*
        Binds event to destroy any tooltips on classlist/mycourses scroll
    */
    bindTooltipScrollDestroy() {
        // Extension to catch scroll end event: http://stackoverflow.com/a/3701328
        $.fn.scrollEnd = function(callback, timeout) {          
          $(this).scroll(function(){
                var $this = $(this);
                if ($this.data('scrollTimeout')) {
                    clearTimeout($this.data('scrollTimeout'));
                }

                $this.data('scrollTimeout', setTimeout(callback,timeout));
            });
        };

        // Bind scrollEnd events on the class data and course list
        $("#classdatawraper").scrollEnd(() => this.removeAllBodyTooltips(), 150);

        $("#courseList").scrollEnd(() => this.removeAllBodyTooltips(), 150);
    }

    /*
        Populates the term selector dropdown beside the search bar
    */
    createTermDropdown() {
        let self = this;

        $("#termselectdropdown").empty();

        // set our current term
        $("#termselect").html(window.unis[this.uni]["terms"][this.term] + ' <img src="assets/arrow.png">');

        // populate the terms
        for (var term in window.unis[this.uni]["terms"]) {
            let thisTerm = window.unis[this.uni]["terms"][term];

            let html = $(`<li><a term="${term}">${thisTerm}</a></li>`);

            html.click(function () {
                // check if they changed terms
                let newTerm = $(this).find("a").attr("term");

                if (newTerm == self.term) return;

                // This is a new term, reinstantiate the object so we can show the new results
                window.classList = new ClassList(self.uni, newTerm);
                window.mycourses = new MyCourses(self.uni, newTerm);

                // reset the calendar
                window.calendar.resetCalendar();
            });

            $("#termselectdropdown").append(html);
        }
    }

    /*
        Populates the location dropdown
    */
    createLocationDropdown() {
        let self = this;

        $("#locationselectdropdown").empty();

        // Set the default value
        $("#locationselect").html('All Locations <img src="assets/arrow.png">');

        // Create and bind the all locations option in the dropdown
        let locHTML = $('<li><a location="all">All Locations</a></li>');

        // Bind the click event
        locHTML.click(() => {
            // Only update if there was a change
            if (this.location == null) return;

            this.location = null;
            $("#locationselect").html('All Locations <img src="assets/arrow.png">');

            // Get the original class data with all info
            this.classdata = JSON.parse(this.stringClassData);

            // Slide up the classdata div
            $("#classdata").slideUp(() => {
                // empty it
                $("#classdata").empty();

                // populate the classdata with the original class data
                this.populateClassList([this.classdata], $("#classdata"), "");
            });
        });

        // Append it to the dropdown
        $("#locationselectdropdown").append(locHTML);

        // Add a divider
        $("#locationselectdropdown").append('<li role="separator" class="divider"></li>');

        // Append every location to the dropdown for this uni
        for (let thislocation of window.unis[self.uni]["locations"]) {
            // Create the HTML
            let html = $(`<li><a location="${thislocation}">${thislocation}</a></li>`);

            // Bind the click event
            html.click(function () {
                // check if they changed locations
                let newLocation= $(this).find("a").attr("location");

                if (newLocation == self.location) return;

                self.location = newLocation;
                $("#locationselect").html(newLocation + ' <img src="assets/arrow.png">');

                // Update the classlist
                self.updateLocation(self.location);

            });

            // Append this to the dropdown
            $("#locationselectdropdown").append(html);
        }
    }

    /*
        Updates the classlist to only include the specified locations
    */
    updateLocation(newLocation) {
        // Get the original class data with all info
        this.classdata = JSON.parse(this.stringClassData);

        // Prune out children that don't have relevant locations
        this.pruneLocations("", "", this.classdata, newLocation);

        // Slide up the class data
        $("#classdata").slideUp(() => {
            // Empty it
            $("#classdata").empty();

            // If we found results, populate it
            if (Object.keys(this.classdata).length > 0) this.populateClassList([this.classdata], $("#classdata"), "");
            else $("#classdata").text("There are no courses with that location :(").slideDown();
        });
    }

    /*
        Recursive function that prunes out branches that don't have a relevant location within them
    */
    pruneLocations(parent, parentkey, data, location) {
        var self = this;

        // Check if this is a class
        if (data["classes"] != null) {
            // Boolean as to whether we've found a class with a relevant location
            let foundLocation = false;

            // array that contains the classes that have the location
            let includesLocations = [];

            for (let thisClass of data["classes"]) {
                if (thisClass.location == location) {
                    foundLocation = true;
                    includesLocations.push(thisClass);
                }
            }

            // overwrite the classes
            data["classes"] = includesLocations;

            // tell the parent to delete themselves if other branches aren't fruitfull
            return !foundLocation;
        }
        else {
            let deleteThis = true;

            // For every key in this data
            for (let key in data) {
                if (key != "description") {
                    // Get this data
                    let thisData = data[key];

                    // Call this function on the child and see if they have any children with a relevant location
                    if (this.pruneLocations(data, key, thisData, location) == false) {
                        deleteThis = false;
                    }
                    else {
                        // No child has a relevant location, remove this branch
                        delete data[key];
                    }
                }
            }

            if (deleteThis) delete parent[parentkey]; // remove this parent branch

            return deleteThis;
        }
    }

    /*
        Retrieves the class list and populates the classes accordion
    */
    getClasses() {
        $("#classdata").fadeOut(() => {
            $("#classdata").empty();

            // Remove any current loading animations for courses
            $("#courseSelector").find("#loading").remove();

            // Add loading animation
            let loading = new Loading($("#CourseDataLoader"), "Loading Course Data...");

            // Get the class data
            $.getJSON(`${this.baseURL}unis/${this.uni}/${this.term}/all`, (data) => {
                this.classdata = data["classes"];
                this.rmpdata = data["rmp"];

                // Make a saved string copy for future purposes if they change locations
                this.stringClassData = JSON.stringify(this.classdata);
                
                // Find the RMP average
                this.findRMPAverage(this.rmpdata);

                loading.remove(() => {
                    // We want to make sure the user hasn't chosen a new term while this one was loading
                    if (this.uni == window.uni && this.term == window.term) {
                        // In case the user spammed different terms while loading
                        
                        // let mycourses load any saved states
                        window.mycourses.loadState();

                        // Create the tutorial obj, if they are new, it will launch it
                        let thistut = new Tutorial();
                        
                        // Empty out the div
                        $("#classdata").empty();

                        // Populate the list
                        this.populateClassList([data["classes"]], $("#classdata"), "");
                        this.bindSearch();
                    }
                });
            })
            .error((data) => {
                // Show the error
                loading.remove(function () {
                    $("#classdata").text(data.responseJSON.error).slideDown();
                });
            });
        });
    }

    /*
        Sets the average of the passed in RMP data
    */
    findRMPAverage(rmpdata) {
        let totalRatings = 0;
        let numRatings = 0;

        for (let key in rmpdata) {
            let teacher = rmpdata[key];
            if (teacher.rating) {
                totalRatings += teacher["rating"];
                numRatings += 1;
            }
        }

        if (numRatings == 0) this.rmpavg = 2.5; // no ratings
        else this.rmpavg = totalRatings/numRatings;
    }

    /*
        Generates a class descriptions (details button contents)
    */
    generateClassDesc(desc) {
        let html = '<div class="accordiondesc">';
        let append_amt = 0;

        if (desc["aka"]) {
            html += "AKA: " + desc["aka"] + "<br>";
            append_amt += 1;
        }

        if (desc["desc"]) {
            html += desc["desc"] + "<br><br>";
            append_amt += 1;
        }

        if (desc["units"]) {
            html += desc["units"] + " units; ";
            append_amt += 1;

            if (desc["hours"] === undefined) {
                html += "<br>";
            }
        }

        if (desc["hours"]) {
            html += desc["hours"] + "<br>";
            append_amt += 1;
        }

        html += '</div>';

        if (append_amt === 0) return "";
        else return html;
    }

    /*
        Generates class details button
    */
    generateClassDetails(element, path) {
        let self = this;

        let button = $(this.generateAccordionHTML("Details", path + "\\description", "accordionDetailButton"));

        button.find("label").click(function () {
            self.bindButton(self.classdata, this, "detail");
        });

        element.append(button);
    }

    /*
        Populates class details
    */
    populateClassDetails(data, element) {
        let html = '<div class="accordiondesc accordiondetail">';

        let detailIndex = 0;
        for (let detail of this.detailKeys) {
            if (data[detail] === undefined) continue;

            // Capitalize the first letter of the key
            let capitalDetail = detail.charAt(0).toUpperCase() + detail.slice(1);

            // Proper spacing
            if (detailIndex > 0) html += "<br><br>"

            html += capitalDetail + ": " + data[detail];

            detailIndex += 1;
        }

        element.append(html);
        element.slideDown();
    }

    /*
        Abbreviates the given times by shortening day codes and spaces
    */
    static abbreviateTimes(time) {
        // abbreviations of days
        let abbreviations = {
            "Mo": "M",
            "Tu": "T",
            "We": "W",
            "Th": "R",
            "Fr": "F",
            "Sa": "S",
            "Su": "U"
        };

        for (let reduce in abbreviations) {
            time = time.replace(reduce, abbreviations[reduce]);
        }

        // remove spacing around the dash
        time = time.replace(" - ", "-");
        
        return time;
    }

    /*
        Returns an RMP link with the data being the rating
    */
    generateRMPLink(rmpdata, teacher) {
        let text = "(N/A)";

        if (rmpdata["rating"]) text = "(" + rmpdata["rating"] + ")";

        if (rmpdata["id"] === undefined) return text;
        else {
            return `<a href='https://www.ratemyprofessors.com/ShowRatings.jsp?tid=${rmpdata.id}' target='_blank' 
                    class='rmplink' rmpteacher='${teacher}'>${text}</a>`;
        }
    }

    /*
        Returns the tooltip html
    */
    generateRMPTooltipHTML(rmpdata) {
        let html = "<b style='font-weight: bold; font-size: 14px;'>Rate My Professors</b><br>";

        let allowedAttributes = [
            {
                "id": "department",
                "name": "Department"
            },
            {
                "id": "rating",
                "name": "Rating"
            },
            {
                "id": "easyrating",
                "name": "Difficulty"
            },
            {
                "id": "numratings",
                "name": "Number of Ratings"
            },
            {
                "id": "rooms",
                "name": "Rooms"
            }
        ];

        for (let attribute of allowedAttributes) {
            // Make sure its id is defined
            if (rmpdata[attribute["id"]]) {
                html += `<b style='font-weight: bold;'>${attribute.name}</b>: ${rmpdata[attribute["id"]]}<br>`;
            }
        }

        return html;
    }

    /*
        Populates a list of given clases
    */
    generateClasses(data, element, path, addButton) {
        let self = this;

        // clone the data since we're going to modify it
        data = JSON.parse(JSON.stringify(data));

        let html = $("<div class='accordiontableparent'><table class='table accordiontable'><tbody></tbody></table></div>");

        // Array that stores the ordered classes
        let orderedClasses = [];

        // Order to use
        let typeOrder = ["LEC", "LCL", "SEM", "LAB", "LBL", "CLN", "TUT"];

        let engineerFlag = preferences.getEngineeringValue();

        // Order the classes
        for (let type of typeOrder) {
            let nonPushedClasses = [];

            // Go through each class and if it has the same type, add it
            for (let thisClass of data["classes"]) {
                // If this student is at U of A and they aren't an engineer, don't display engineering classes
                if (self.uni === 'UAlberta' && Number(self.term) % 10 === 0 && engineerFlag === false) {
                    if (thisClass['section'][1].match(/[a-z]/i) !== null) continue;

                    if (thisClass["type"] === type) orderedClasses.push(thisClass);
                    else nonPushedClasses.push(thisClass);
                }
                else {
                    if (thisClass["type"] === type) orderedClasses.push(thisClass);
                    else nonPushedClasses.push(thisClass);
                }
            }

            data["classes"] = nonPushedClasses;
        }

        // Add the rest of the classes that weren't matched
        for (let thisClass of data["classes"]) {
            orderedClasses.push(thisClass);
        }


        for (let thisClass of orderedClasses) {
            let thisHTML = "<tr>";
            let id;

            if (thisClass.section) id = `${thisClass.type}-${thisClass.section} (${thisClass.id})`;
            else id = `${thisClass.type}-${thisClass.group} (${thisClass.id})`;
            
            thisHTML += "<td style='width: 18%;'>" + id + "</td>";

            let teachersHTML = "";
            let addedTeachers = [];

            for (let teacher in thisClass["teachers"]) {
                let thisTeacher = thisClass["teachers"][teacher];

                if (addedTeachers.indexOf(thisTeacher) !== -1) continue;
                if (teacher > 0) teachersHTML += "<br>";

                teachersHTML += ClassList.abbreviateName(thisTeacher);

                if (this.rmpdata[thisTeacher]) {
                    teachersHTML += " " + this.generateRMPLink(this.rmpdata[thisTeacher], thisTeacher);
                }

                addedTeachers.push(thisTeacher);
            }

            let classTimes = thisClass["times"].slice();
            let addedTimes = [];

            // we want to reduce the size of the times (Th) and remove dupes
            for (let time in classTimes) {
                let abbrevTime = ClassList.abbreviateTimes(classTimes[time]);

                if (addedTimes.indexOf(abbrevTime) === -1) addedTimes.push(abbrevTime);
            }

            // Remove duplicates in rooms
            let addedRooms = [];

            for (let room of thisClass["rooms"]) {
                if (addedRooms.indexOf(room) === -1) addedRooms.push(room);
            }

            thisHTML += "<td style='width: 20%;'>" + teachersHTML + "</td>";
            thisHTML += "<td>" + addedRooms.join("<br>") + "</td>";
            thisHTML += "<td style='width: 25%;'>" + addedTimes.join("<br>") + "</td>";
            thisHTML += "<td style='width: 15%;'>" + thisClass["location"] + "</td>";
            thisHTML += "<td>" + thisClass["status"] + "</td>";
            thisHTML += "</tr>";

            thisHTML = $(thisHTML);

            if (addButton) {
                // check whether the user has added this class already
                if (window.mycourses.hasClass(thisClass["id"]) === true) {
                    self.appendClassRemoveBtn(thisClass["id"], path, thisHTML);
                }
                else {
                    self.appendClassAddBtn(thisClass["id"], path, thisHTML);
                }
            }

            html.find("tbody").append(thisHTML);
        }

        // Add tooltips to the rmp ratings
        html.find('a[rmpteacher]').each(function () {
            let teacher = $(this).attr("rmpteacher");

            // Generate the tooltip text
            let tooltipText = self.generateRMPTooltipHTML(self.rmpdata[teacher]);

            // Add the attributes to the element
            $(this).attr("title", tooltipText);
            $(this).attr("data-toggle", "tooltip");

            // Instantiate the tooltip
            $(this).tooltip({container: 'body', html: true});
        });

        element.append(html);

        return html;
    }

    /*
        Abbreviates a given name
    */
    static abbreviateName(name) {
        // We abbreviate everything except the last name
        let fragments = name.split(" ");
        let abbreviated = "";

        for (let fragment in fragments) {
            // Only add spaces in between words
            if (fragment > 0) abbreviated += " ";

            if (fragment == (fragments.length-1)) {
                // keep the full name
                abbreviated += fragments[fragment];
            }
            else if (fragment == 0) {
                let firstName = fragments[fragment];

                abbreviated += firstName.charAt(0).toUpperCase() + ".";
            }
        }

        return abbreviated;
    }

    /*
        Populates a class
    */
    populateClass(data, element, path) {
        if (data.description === undefined) return;

        element.append(this.generateClassDesc(data["description"]));

        // Does this class have more info we can put in a details button?
        let foundDetails = false;
        for (let detail of this.detailKeys) {
            if (data["description"][detail]) {
                foundDetails = true;
                break;
            }
        }

        if (foundDetails === true) {
            // We have data to make a dropdown for
            this.generateClassDetails(element, path);
        }

        // Populate the class list
        this.generateClasses(data, element, path, true);
    }

    /*
        Does proper DOM manipulation for adding accordion elements
    */
    addAccordionDOM(data, element, path) {
        let self = this;

        for (let elem of data) {
            // this array is sorted by order of importance of populating the elements
            if (!elem) continue;

            for (let key in elem) {
                if (key === "classes") {
                    // This is a class, process it differently
                    this.populateClass(elem, element, path);
                }
                else if (key != "description") {
                    // Generate this new element, give it the path
                    let thisPath = "";

                    if (elem[key]["path"]) thisPath = elem[key]["path"];
                    else thisPath = path + "\\" + key;

                    let name = key;

                    if (elem[key]["description"] && elem[key]["description"]["name"]) {
                        name += " - " + elem[key]["description"]["name"]
                    }

                    let thisHTMLElement = $(this.generateAccordionHTML(name, thisPath));

                    if (elem[key]["classes"]) {
                        // check if the user has already selected this course
                        // if so, put a remove button
                        let subject = thisPath.split("\\");
                        let courseNum = subject[subject.length-1]; // 203
                        subject = subject[subject.length-2]; // CPSC
                        let courseCode = subject + " " + courseNum; // CPSC 203

                        if (window.mycourses.hasCourse(courseCode)) {
                            this.appendCourseRemoveBtn(courseCode, thisHTMLElement.find("label"));
                        }
                        else this.appendCourseAddBtn(courseCode, thisHTMLElement.find("label"));
                    }

                    thisHTMLElement.find("label").click(function (event) {
                        event.stopPropagation();
                        self.bindButton(self.classdata, this, "class");
                    });

                    element.append(thisHTMLElement);
                }
            }
        }
    }

    /*
        Appends a course add button to the element
    */
    appendCourseAddBtn(coursecode, element) {
        let self = this;

        // this is a label for a course, allow the user to add the general course
        let addButton = $(`<div class="addCourseButton" code="${coursecode}">+</div>`);

        addButton.click(function (event) {
            event.stopPropagation();

            // get the path for this course
            let path = $(this).parent().attr("path");
            let splitPath = path.split("\\");

            let courseData = self.classdata;

            // get the data for this course
            for (let aPath in splitPath) {
                if (splitPath[aPath] != "") courseData = courseData[splitPath[aPath]];
            }

            // Add the course to the current active group
            window.mycourses.addCourse(courseData, path);

            // we want to remove this button and replace it with a remove btn
            let courseCode = $(this).attr("code");

            self.appendCourseRemoveBtn(courseCode, $(this).parent());

            // now remove this old button
            $(this).remove();
        });

        element.append(addButton);
    }

    /*
        Appends a remove course button to the element
    */
    appendCourseRemoveBtn(coursecode, element) {
        let self = this;
        let removeBtn = $(`<div class="removeCourseButton" code="${coursecode}">×</div>`);

        removeBtn.click(function (event) {
            event.stopPropagation();

            let courseCode = $(this).attr("code");

            // remove the course
            window.mycourses.removeCourse(courseCode);

            // add an "add" button
            self.appendCourseAddBtn(courseCode, $(this).parent());

            // remove this button
            $(this).remove();
        });

        element.append(removeBtn);
    }

    /*
        Appends an add class button to the element (table)
    */
    appendClassAddBtn(id, path, element) {
        let self = this;
        let button = $(`<td><button class="btn btn-default" classid="${id}" path="${path}">&plus;</button></td>`);

        button.find("button").click(function () {
            // get the path for this course
            let path = $(this).attr('path');
            let splitPath = path.split("\\");

            let courseData = self.classdata;

            // get the data for this course
            for (let aPath in splitPath) {
                if (splitPath[aPath] != "") courseData = courseData[splitPath[aPath]];
            }

            window.mycourses.addCourse(courseData, $(this).attr('path'), $(this).attr('classid'));

            // now add a remove button here
            self.appendClassRemoveBtn($(this).attr('classid'), $(this).attr('path'), $(this).parent().parent());

            $(this).parent().remove();
        });

        // append it to the element
        element.append(button);
    }

    /*
        Appends a class remove button to the specified element
    */
    appendClassRemoveBtn(id, path, element) {
        let self = this;

        let button = $(`<td><button class="btn btn-default" id="removeClassBtn" classid="${id}" path="${path}">×</button></td>`);

        button.find("button").click(function () {
            // get the path for this course
            let path = $(this).attr('path');
            let splitPath = path.split("\\");

            let courseData = self.classdata;

            // get the data for this course
            for (let aPath in splitPath) {
                if (splitPath[aPath] != "") courseData = courseData[splitPath[aPath]];
            }

            window.mycourses.removeClass($(this).attr('classid'));

            self.appendClassAddBtn($(this).attr('classid'), $(this).attr('path'), $(this).parent().parent());

            $(this).parent().remove();
        });

        // append it to the element
        element.append(button);
    }

    /*
        Updates the remove button on a removed course in My Courses
    */
    updateRemovedCourse(coursecode) {
        let removedCourse = $(`div[code='${coursecode}']`);

        if (removedCourse.length > 0) {
            this.appendCourseAddBtn(coursecode, removedCourse.parent());
            removedCourse.remove();
        }
    }

    /*
        Updates the add button on an added course in My Courses
    */
    updateAddedCourse(coursecode) {
        let addedCourse = $(`div[code='${coursecode}']`);

        if (addedCourse.length > 0) {
            this.appendCourseRemoveBtn(coursecode, addedCourse.parent());
            addedCourse.remove();
        }
    }

    /*
        Updates the specified class button if it is visible
    */
    updateRemovedClass(classid) {
        let removedClass = $(`button[classid='${classid}']`);

        if (removedClass.length > 0) {
            this.appendClassAddBtn(classid, removedClass.attr("path"), removedClass.parent().parent());
            removedClass.parent().remove();
        }
    }

    /*
        Populates the classlist on demand given the hierarchy
    */
    populateClassList(data, element, path, noanimations) {
        if (noanimations != true) {
            // Slide up the element
            element.slideUp(() => {
                this.addAccordionDOM(data, element, path);
                element.slideDown();
            });
        }
        else {
            this.addAccordionDOM(data, element, path);
            element.show();
        }
    }

    /*
        Binds an accordion button
    */
    bindButton(classdata, button, type) {
        // Onclick handler

        // do we need to close the element?
        if ($(button).attr("accordopen") == "true") {
            // Close the element
            $(button).attr("accordopen", "false");

            $(button).parent().find("ul").slideUp(function () {
                $(this).empty();
            });
        }
        else {
            // Open accordion
            let thisPath = $(button).attr("path").split("\\");
            $(button).attr("accordopen", "true");

            // Element to populate
            let element = $(button).parent().find("ul");

            // want to find the data to populate
            let thisData = classdata;
            for (let key in thisPath) {
                if (key > 0) thisData = thisData[thisPath[key]];
            }
            
            // Populate the element
            if (type === "class") this.populateClassList([thisData], element, $(button).attr("path"));
            else if (type === "detail") this.populateClassDetails(thisData, element);
        }
    }

    /*
        Binds search
    */
    bindSearch() {
        this.typingtimer = null;
        this.typinginterval = 100;

        $("#searchcourses").keyup((e) => {
            clearTimeout(this.typingtimer);

            let searchVal = $("#searchcourses").val();

            this.searchFound = [];
            this.searchphrase = searchVal.toLowerCase();

            if (searchVal == "" || searchVal == " ") {
                // Just populate the faculties
                $("#classdata").empty();
                this.populateClassList([this.classdata], $("#classdata"), "", true);
            }
            else {
                if (searchVal.length > 2) {
                    this.typingtimer = setTimeout(() => {
                        this.doneTyping();
                    }, this.typinginterval);
                }
            }

            
        })
    }

    /*
        Empties and repopulates the accordion with the default view (requires classdata to be fetched)
    */
    repopulateAccordion() {
        if (this.classdata) {
            $("#classdata").empty();
            this.populateClassList([this.classdata], $("#classdata"), "", true);  
        }
    }

    /*
        Performs the search given the phrase when the user is done typing
    */
    doneTyping() {
        let searchPhraseCopy = this.searchphrase.slice();

        // find and populate the results
        this.findText(this.classdata, searchPhraseCopy, "", "", 0);

        // empty out whatever is there
        $("#classdata").empty();

        // scroll to the top
        $("#classdatawraper").scrollTop(0);

        if (this.searchFound.length && searchPhraseCopy == this.searchphrase) {
            // We found results
            this.populateClassList(this.searchFound, $("#classdata"), "", true);
        }
        else if (searchPhraseCopy == this.searchphrase) {
            $("#classdata").text("We couldn't find anything").slideDown();
        }
    }

    /*
        Returns a boolean as to whether the given class contains the specified text
    */
    findTextInClasses(data, text) {
        // Check each class for matches
        for (let key in data["classes"]) {
            let thisClass = data["classes"][key];

            for (let prop in thisClass) {
                // Check if an array
                if (thisClass[prop].constructor === Array) {
                    for (let newProp in thisClass[prop]) {
                        if (thisClass[prop][newProp].toString().toLowerCase().indexOf(text) > -1) return true;
                    }
                }
                else if (thisClass[prop].toString().toLowerCase().indexOf(text) > -1) return true;
            }
        }

        // Check the description attributes
        for (let key in data["description"]) {
            let thisDesc = data["description"][key];

            if (thisDesc.toString().toLowerCase().indexOf(text) > -1) return true;
        }

        // Didn't find a match
        return false;
    }

    /*
        Properly adds a search result to the global dict
    */
    addSearchData(data, key, depth, path) {
        data = jQuery.extend({}, data);
        data["path"] = path;

        if (this.searchFound[depth] === undefined) this.searchFound[depth] = {};

        this.searchFound[depth][key] = data;
    }

    /*
        Populates the global searchFound obj with courses that match the specified text (recursive)
    */
    findText(data, text, path, prevkey, depth, alreadyFound) {
        if (text != this.searchphrase) return;

        if (data["classes"] != undefined) {
            // we are parsing a class
            if (!this.findTextInClasses(data, text)) return;

            let splitPath = path.split("\\");
            let key = splitPath[splitPath.length-2] + " " + prevkey;

            // We only want to add this course if it hasn't already been added
            if (!alreadyFound) this.addSearchData(data, key, depth, path);
        }
        else {
            for (let key in data) {
                if (key == "description") return;

                let thisFound = false;
                let thisPath = path + "\\" + key;
                let searchKey = key;

                // Add the subject to a course num if we can (231 = CPSC 231)
                if (data[key]["classes"]) {
                    let splitPath = thisPath.split("\\");
                    searchKey = splitPath[splitPath.length-2] + " " + searchKey;
                }

                // Find the text
                if (searchKey.toLowerCase().indexOf(text) > -1) {
                    // We found it in the key, add it
                    this.addSearchData(data[key], searchKey, depth, thisPath);
                    thisFound = true;
                }
                else {
                    let desc = data[key]["description"];

                    // check if it has a description, if so, check that
                    if (desc && desc.name && desc.name.toLowerCase().indexOf(text) > -1) {
                        // We found the text in the description, add it to the found list
                        this.addSearchData(data[key], searchKey, depth, thisPath);
                        thisFound = true;
                    }
                }

                // Recursively look at the children
                this.findText(data[key], text, thisPath, key, depth+1, thisFound);

            }
        }
    }

    /*
        Generates the general accordian structure HTML given a value
    */
    generateAccordionHTML(value, path, customclasses) {
        if (customclasses) {
            return `
                <li class="has-children">
                    <label path="${path}" accordopen="false" class="${customclasses}">${value}</label>
                    <ul></ul>
                </li>
            `;
        }
        else {
            return `
                <li class="has-children">
                    <label path="${path}" accordopen="false">${value}</label>
                    <ul></ul>
                </li>
            `;
        }
    }
}
