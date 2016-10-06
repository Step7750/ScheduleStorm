class ClassList {
    constructor(uni, term) {

        this.baseURL = "http://api.schedulestorm.com:5000/v1/";
        this.detailKeys = ["prereq", "coreq", "antireq", "notes"];
        this.uni = uni;
        this.term = term;
        window.term = term;
        window.uni = uni;

        // we want to save the term and uni in localstorage
        localStorage.setItem('uni', uni);
        localStorage.setItem('term', term);

        this.location = location;
        this.searchFound = []; // Array that sorts search results by order of importance

        $("#searchcourses").unbind(); // unbind search if there is a bind

        this.createTermDropdown();
        this.getClasses();
    }


    /*
        Populates the term selector dropdown beside the search bar
    */
    createTermDropdown() {
        var self = this;

        $("#termselectdropdown").empty();

        // set our current term
        $("#termselect").html(window.unis[this.uni]["terms"][this.term] + ' <img src="assets/arrow.png">');

        // populate the terms
        for (var term in window.unis[this.uni]["terms"]) {
            var html = $('<li><a term="' + term + '">' + window.unis[this.uni]["terms"][term] + '</a></li>');

            html.click(function () {
                // check if they changed terms
                var newterm = $(this).find("a").attr("term");
                if (newterm != self.term) {
                    // This is a new term, reinstantiate the object so we can show the new results
                    window.classList = new ClassList(self.uni, newterm);
                    window.mycourses = new MyCourses(self.uni, newterm);

                    // reset the calendar
                    window.calendar.resetCalendar();
                }
            })

            $("#termselectdropdown").append(html);
        }

    }

    /*
        Retrieves the class list and populates the classes accordion
    */
    getClasses() {
        var self = this;

        $("#classdata").fadeOut(function () {
            $("#classdata").empty();

            // Remove any current loading animations for courses
            $("#courseSelector").find("#loading").remove();

            // Add loading animation
            var loading = new Loading($("#CourseDataLoader"), "Loading Course Data...");

            // Get the class data
            $.getJSON(self.baseURL + "unis/" + self.uni + "/" + self.term + "/all", function(data) {
                self.classdata = data["classes"];
                self.rmpdata = data["rmp"];
                
                // Find the RMP average
                self.findRMPAverage(self.rmpdata);

                loading.remove(function () {
                    // We want to make sure the user hasn't chosen a new term while this one was loading
                    if (self.uni == window.uni && self.term == window.term) {
                        // In case the user spammed different terms while loading
                        $("#classdata").empty();

                        // Remove the loading animation and populate the list
                        self.populateClassList([data["classes"]], $("#classdata"), "");
                        self.bindSearch();
                    }
                });
                
            });
        });
    }

    /*
        Sets the average of the passed in RMP data
    */
    findRMPAverage(rmpdata) {
        var self = this;

        var totalratings = 0;
        var numratings = 0;

        for (var teacher in rmpdata) {
            var thisteacher = rmpdata[teacher];

            if (thisteacher["rating"] != undefined) {
                totalratings += thisteacher["rating"];
                numratings += 1;
            }
        }

        if (numratings == 0) {
            // This term has no ratings
            self.rmpavg = 2.5;
        }
        else {
            self.rmpavg = totalratings/numratings;
        }
    }

    /*
        Generates a class descriptions (details button contents)
    */
    generateClassDesc(desc) {
        var html = '<div class="accordiondesc">';

        if (desc["aka"] != undefined) {
            html += "AKA: " + desc["aka"] + "<br>";
        }
        if (desc["desc"] != undefined) {
            html += desc["desc"] + "<br><br>";
        }

        if (desc["units"] != undefined) {
            html += desc["units"] + " units; ";

            if (desc["hours"] == undefined) {
                html += "<br>";   
            }
        }

        if (desc["hours"] != undefined) {
            html += desc["hours"] + "<br>";
        }

        return html;
    }

    /*
        Generates class details button
    */
    generateClassDetails(element, path) {
        var self = this;

        var button = $(this.generateAccordionHTML("Details", path + "\\description"));

        button.find("label").click(function () {
            self.bindButton(self.classdata, this, "detail");
        });

        element.append(button);
    }

    /*
        Populates class details
    */
    populateClassDetails(data, element) {
        var html = '<div class="accordiondesc accordiondetail">';

        var detailIndex = 0;
        for (var detail in this.detailKeys) {
            var detail = this.detailKeys[detail];

            if (data[detail] != undefined) {
                // Capitalize the first letter of the key
                var capitalDetail = detail.charAt(0).toUpperCase() + detail.slice(1);

                // Proper spacing
                if (detailIndex > 0) {
                    html += "<br><br>"
                }
                html += capitalDetail + ": " + data[detail];

                detailIndex += 1;
            }
        }
        element.append(html);

        element.slideDown();
    }

    /*
        Abbreviates the given times by shortening day codes and spaces
    */
    static abbreviateTimes(time) {
        // abbreviations of days
        var abbreviations = {
            "Mo": "M",
            "Tu": "T",
            "We": "W",
            "Th": "R",
            "Fr": "F",
            "Sa": "S",
            "Su": "U"
        }

        for (var reduce in abbreviations) {
            time = time.replace(reduce, abbreviations[reduce]);
        }

        // remove spacing around the dash
        time = time.replace(" - ", "-");
        
        return time;
    }

    /*
        Populates a list of given clases
    */
    generateClasses(data, element, path, addButton) {
        var self = this;

        // clone the data since we're going to modify it
        data = JSON.parse(JSON.stringify(data));

        var html = $("<div class='accordiontableparent'><table class='table accordiontable'><tbody></tbody></table></div>");

        // Array that stores the ordered classes
        var orderedClasses = [];

        // Order to use
        var typeOrder = ["LEC", "LCL", "SEM", "LAB", "LBL", "CLN", "TUT"];

        // Order the classes
        for (var type in typeOrder) {

            var nonPushedClasses = [];

            type = typeOrder[type];

            // Go through each class and if it has the same type, add it
            for (var index = 0; index < data["classes"].length; index++) {
                var thisclass = data["classes"][index];
                if (self.uni === 'UAlberta' && Number(self.term)%10 === 0 && preferences.getEngineeringValue() === false) {
                    if (thisclass['section'][1].match(/[a-z]/i) === null){
                        if (thisclass["type"] == type) {
                        // add to the ordered classes
                        orderedClasses.push(thisclass);
                        }
                        else {
                            // push it to the classes that haven't been pushed yet
                            nonPushedClasses.push(thisclass);
                        }
                    }
                }
                else{
                    if (thisclass["type"] == type) {
                        // add to the ordered classes
                        orderedClasses.push(thisclass);
                    }
                    else {
                        // push it to the classes that haven't been pushed yet
                        nonPushedClasses.push(thisclass);
                    }
                }
            }

            data["classes"] = nonPushedClasses;
        }

        // Add the rest of the classes that weren't matched
        for (var index = 0; index < data["classes"].length; index++) {
            var thisclass = data["classes"][index];
            // add to the ordered classes
            orderedClasses.push(thisclass);
        }

        for (var index = 0; index < orderedClasses.length; index++) {
            
            var thishtml = "<tr>";

            var thisclass = orderedClasses[index];

            var id = thisclass["type"] + "-" + thisclass["group"] + " (" + thisclass["id"] + ")";
            
            thishtml += "<td style='width: 15%;'>" + id + "</td>";

            var teachers = "";
            var addedTeachers = [];

            for (var teacher in thisclass["teachers"]) {
                // Check if we've already added this teacher
                if (addedTeachers.indexOf(thisclass["teachers"][teacher]) == -1) {
                    if (teacher > 0) {
                        teachers += "<br>";
                    }
                    teacher = thisclass["teachers"][teacher];

                    // want to find RMP rating
                    var rating = "";
                    if (this.rmpdata[teacher] != undefined) {
                        rating = this.rmpdata[teacher]["rating"];
                    }

                    if (teacher != "Staff") {
                        teacher = ClassList.abbreviateName(teacher);
                    }

                    teachers += teacher;

                    if (rating != "") {
                        teachers += " (" + rating + ")";
                    }

                    addedTeachers.push(teacher);
                }
            }

            var timescopy = thisclass["times"].slice();
            var addedTimes = [];
            // we want to reduce the size of the times (Th) and remove dupes
            for (var time in timescopy) {
                var abbrevTime = ClassList.abbreviateTimes(timescopy[time]);

                if (addedTimes.indexOf(abbrevTime) == -1) {
                    addedTimes.push(abbrevTime);
                }
            }

            // Remove duplicates in rooms
            var addedRooms = [];

            for (var room in thisclass["rooms"]) {
                room = thisclass["rooms"][room];

                if (addedRooms.indexOf(room) == -1) {
                    addedRooms.push(room);
                }
            }

            thishtml += "<td style='width: 20%;'>" + teachers + "</td>";

            thishtml += "<td>" + addedRooms.join("<br>") + "</td>";

            thishtml += "<td style='width: 25%;'>" + addedTimes.join("<br>") + "</td>";

            thishtml += "<td style='width: 15%;'>" + thisclass["location"] + "</td>";

            thishtml += "<td>" + thisclass["status"] + "</td>";

            thishtml += "</tr>";

            thishtml = $(thishtml);

            if (addButton) {
                // check whether we have added this class already
                if (window.mycourses.hasClass(thisclass["id"]) == true) {
                    self.appendClassRemoveBtn(thisclass["id"], path, thishtml);
                }
                else {
                    self.appendClassAddBtn(thisclass["id"], path, thishtml);
                }
            }

            html.find("tbody").append(thishtml);
        }

        element.append(html);

        return html;
    }

    /*
        Abbreviates a given name
    */
    static abbreviateName(name) {
        // We abbreviate everything except the last name
        var fragments = name.split(" ");
        var abbreviated = "";

        for (var fragment in fragments) {
            // Only add spaces in between words
            if (fragment > 0) {
                abbreviated += " ";
            }

            if (fragment == (fragments.length-1)) {
                // keep the full name
                abbreviated += fragments[fragment];
            }
            else if (fragment == 0) {
                var word = fragments[fragment];

                abbreviated += word.charAt(0).toUpperCase() + ".";
            }
        }

        return abbreviated;
    }

    /*
        Populates a class
    */
    populateClass(data, element, path) {
        if (data["description"] != undefined) {
            element.append(this.generateClassDesc(data["description"]));

            // Does this class have more info we can put in a details button?
            var foundDetails = false;
            for (var detail in this.detailKeys) {
                detail = this.detailKeys[detail];

                if (data["description"][detail] != undefined) {
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
    }

    /*
        Does proper DOM manipulation for adding accordion elements
    */
    addAccordionDOM(data, element, path) {
        var self = this;

        for (var arrayelement in data) {
            // this array is sorted by order of importance of populating the elements
            var thisdata = data[arrayelement];

            if (thisdata != undefined) {
                for (var val in thisdata) {
                    if (val == "classes") {
                        // This is a class, process it differently
                        self.populateClass(thisdata, element, path);
                    }
                    else if (val != "description") {
                        // Generate this new element, give it the path
                        var thispath = "";
                        if (thisdata[val]["path"] != undefined) {
                            thispath = thisdata[val]["path"];
                        }
                        else {
                            thispath = path + "\\" + val;
                        }

                        var name = val;
                        
                        if (thisdata[val]["description"] != undefined) {
                            if (thisdata[val]["description"]["name"] != undefined) {
                                name += " - " + thisdata[val]["description"]["name"]
                            }
                        }

                        var thiselement = $(self.generateAccordionHTML(name, thispath));

                        if (thisdata[val]["classes"] != undefined) {

                            // check if the user has already selected this course
                            // if so, put a remove button
                            var subject = thispath.split("\\");

                            var coursenum = subject[subject.length-1] // 203
                            var subject = subject[subject.length-2]; // CPSC

                            var coursecode = subject + " " + coursenum; // CPSC 203

                            if (window.mycourses.hasCourse(coursecode)) {
                                self.appendCourseRemoveBtn(coursecode, thiselement.find("label"));
                            }
                            else {
                                self.appendCourseAddBtn(coursecode, thiselement.find("label"));
                            }
                        }

                        thiselement.find("label").click(function (event) {
                            event.stopPropagation();
                            self.bindButton(self.classdata, this, "class");
                        });
                        element.append(thiselement);
                    }
                }
            }
        }
    }

    /*
        Appends a course add button to the element
    */
    appendCourseAddBtn(coursecode, element) {
        var self = this;

        // this is a label for a course, allow the user to add the general course
        var addbutton = $('<div class="addCourseButton" code="' + coursecode +'">+</div>');

        addbutton.click(function (event) {
            event.stopPropagation();

            // get the path for this course
            var path = $(this).parent().attr("path");
            var splitpath = path.split("\\");


            var coursedata = self.classdata;

            // get the data for this course
            for (var apath in splitpath) {
                if (splitpath[apath] != "") {
                    coursedata = coursedata[splitpath[apath]];
                }
            }

            // Add the course to the current active group
            window.mycourses.addCourse(coursedata, path);

            // we want to remove this button and replace it with a remove btn
            var coursecode = $(this).attr("code");

            self.appendCourseRemoveBtn(coursecode, $(this).parent());

            // now remove this old button
            $(this).remove();
        });

        element.append(addbutton);
    }

    /*
        Appends a remove course button to the element
    */
    appendCourseRemoveBtn(coursecode, element) {
        var self = this;

        var removebtn = $('<div class="removeCourseButton" code="' + coursecode + '">×</div>');

        removebtn.click(function (event) {
            event.stopPropagation();

            var coursecode = $(this).attr("code");

            // remove the course
            window.mycourses.removeCourse(coursecode);

            // add an "add" button
            self.appendCourseAddBtn(coursecode, $(this).parent());

            // remove this button
            $(this).remove();
        });

        element.append(removebtn);
    }

    /*
        Appends an add class button to the element (table)
    */
    appendClassAddBtn(id, path, element) {
        var self = this;

        var button = $('<td><button class="btn btn-default" classid="' + id + '" path="' + path + '">&plus;</button></td>');

        button.find("button").click(function () {
            // get the path for this course
            var path = $(this).attr('path');
            var splitpath = path.split("\\");

            var coursedata = self.classdata;

            // get the data for this course
            for (var apath in splitpath) {
                if (splitpath[apath] != "") {
                    coursedata = coursedata[splitpath[apath]];
                }
            }

            window.mycourses.addCourse(coursedata, $(this).attr('path'), $(this).attr('classid'));

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
        var self = this;

        var button = $('<td><button class="btn btn-default" id="removeClassBtn" classid="' + id + '" path="' + path + '">×</button></td>');

        button.find("button").click(function () {
            // get the path for this course
            var path = $(this).attr('path');
            var splitpath = path.split("\\");

            var coursedata = self.classdata;

            // get the data for this course
            for (var apath in splitpath) {
                if (splitpath[apath] != "") {
                    coursedata = coursedata[splitpath[apath]];
                }
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
        var removedCourse = $("div[code='" + coursecode + "']");
        if (removedCourse.length > 0) {
            var parent = removedCourse.parent();
            this.appendCourseAddBtn(coursecode, removedCourse.parent());
            removedCourse.remove();
        }
    }

    /*
        Updates the add button on an added course in My Courses
    */
    updateAddedCourse(coursecode) {
        var addedCourse = $("div[code='" + coursecode + "']");
        if (addedCourse.length > 0) {
            var parent = addedCourse.parent();
            this.appendCourseRemoveBtn(coursecode, addedCourse.parent());
            addedCourse.remove();
        }
    }

    /*
        Updates the specified class button if it is visible
    */
    updateRemovedClass(classid) {
        var removedClass = $("button[classid='" + classid + "']");
        if (removedClass.length > 0) {
            this.appendClassAddBtn(classid, removedClass.attr("path"), removedClass.parent().parent());
            removedClass.parent().remove();
        }
    }

    /*
        Populates the classlist on demand given the hierarchy
    */
    populateClassList(data, element, path, noanimations) {
        var self = this;

        if (noanimations != true) {
            // Slide up the element
            element.slideUp(function () {
                self.addAccordionDOM(data, element, path);
                element.slideDown();
            });
        }
        else {
            self.addAccordionDOM(data, element, path);
            element.show();
        }

    }

    /*
        Binds an accordion button
    */
    bindButton(classdata, button, type) {
        //console.log(classdata);
        //console.log(button);

        var self = this;
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
            var thispath = $(button).attr("path").split("\\");
            $(button).attr("accordopen", "true");

            // Element to populate
            var element = $(button).parent().find("ul");

            // want to find the data to populate
            var thisdata = classdata;
            for (var key in thispath) {
                if (key > 0) {
                    thisdata = thisdata[thispath[key]];
                }
            }
            
            // Populate the element
            if (type == "class") {
                self.populateClassList([thisdata], element, $(button).attr("path"));
            }
            else if (type == "detail") {
                self.populateClassDetails(thisdata, element);
            }
        }
    }

    /*
        Binds search
    */
    bindSearch() {
        // Custom search
        var self = this;

        self.typingtimer = null;
        self.typinginterval = 100;

        $("#searchcourses").keyup(function (e) {

            clearTimeout(self.typingtimer);

            var searchval = $("#searchcourses").val();

            self.searchFound = [];

            self.searchphrase = searchval.toLowerCase();


            if (searchval == "" || searchval == " ") {
                // Just populate the faculties
                $("#classdata").empty();
                self.populateClassList([self.classdata], $("#classdata"), "", true);
            }
            else {
                if (searchval.length > 2) {
                    self.typingtimer = setTimeout(function () {
                        self.doneTyping();
                    }, self.typinginterval);
                }
            }

            
        })
    }

    /*
        Performs the search given the phrase when the user is done typing
    */
    doneTyping() {
        var self = this;

        var searchphrasecopy = self.searchphrase.slice();

        // find and populate the results
        self.findText(self.classdata, searchphrasecopy, "", "", 0);

        // empty out whatever is there
        $("#classdata").empty();

        // scroll to the top
        $("#classdatawraper").scrollTop(0);

        if (self.searchFound.length && searchphrasecopy == self.searchphrase) {
            // We found results
            self.populateClassList(self.searchFound, $("#classdata"), "", true);
        }
        else if (searchphrasecopy == self.searchphrase) {
            $("#classdata").text("We couldn't find anything").slideDown();
        }
    }

    /*
        Returns a boolean as to whether the given class contains the specified text
    */
    findTextInClasses(data, text) {

        // Check each class for matches
        for (var key in data["classes"]) {
            var thisclass = data["classes"][key];

            for (var prop in thisclass) {

                // Check if an array
                if (thisclass[prop].constructor === Array) {
                    for (var newprop in thisclass[prop]) {
                        if (thisclass[prop][newprop].toString().toLowerCase().indexOf(text) > -1) {
                            return true;
                        }
                    }
                }
                else if (thisclass[prop].toString().toLowerCase().indexOf(text) > -1) {
                    return true;
                }
            }
        }

        // Check the description attributes
        for (var key in data["description"]) {
            var thisdesc = data["description"][key];

            if (thisdesc.toString().toLowerCase().indexOf(text) > -1) {
                return true;
            }
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

        if (this.searchFound[depth] == undefined) {
            this.searchFound[depth] = {};
        }

        this.searchFound[depth][key] = data;
    }

    /*
        Populates the global searchFound obj with courses that match the specified text (recursive)
    */
    findText(data, text, path, prevkey, depth, alreadyFound) {
        if (text != this.searchphrase) {
            return;
        }

        if (data["classes"] != undefined) {
            // we are parsing a class

            if (this.findTextInClasses(data, text)) {
                var splitpath = path.split("\\");
                var key = splitpath[splitpath.length-2] + " " + prevkey;

                // We only want to add this course if it hasn't already been added
                if (alreadyFound != true) this.addSearchData(data, key, depth, path);
            }
        }
        else {
            for (var key in data) {
                if (key != "description") {

                    var thispath = path + "\\" + key;

                    var searchkey = key;

                    // Add the subject to a course num if we can (231 = CPSC 231)
                    if (depth == 2) {
                        splitpath = thispath.split("\\");
                        searchkey = splitpath[splitpath.length-2] + " " + searchkey;
                    }

                    var thisFound = false;
                    // Find the text
                    if (searchkey.toLowerCase().indexOf(text) > -1) {
                        // We found it in the key, add it
                        this.addSearchData(data[key], searchkey, depth, thispath);
                        thisFound = true;
                    }
                    else {
                        // check if it has a description, if so, check that
                        if (data[key]["description"] != undefined && data[key]["description"]["name"] != undefined) {
                            if (data[key]["description"]["name"].toLowerCase().indexOf(text) > -1) {
                                // We found the text in the description, add it to the found list
                                this.addSearchData(data[key], searchkey, depth, thispath);
                                thisFound = true;
                            }
                        }
                    }

                    var thisdata = data[key];
                    
                    // Recursively look at the children
                    this.findText(thisdata, text, thispath, key, depth+1, thisFound);
                }
            }
        }
    }

    /*
        Generates the general accordian structure HTML given a value
    */
    generateAccordionHTML(value, path) {
        return '<li class="has-children"><label path="' + path +'" accordopen="false">' + value + '</label><ul></ul></li>';
    }
}