class MyCourses {
    constructor(uni, term) {
        // TODO: Add saving courses, currently uni and term are redundant
        this.courses = [];
        this.generator = false;

        // Update the preferences shown
        window.preferences.updatedUni(uni);

        this.numConvert = {
            0: "All",
            1: "One",
            2: "Two",
            3: "Three",
            4: "Four",
            5: "Five"
        }

        // Type represents how many courses to choose (0 = all, 1 = one of, etc)
        this.setupPills();
    }

    /*
        Sets up the initial group pills and creates the "All of" initial pill
    */
    setupPills() {
        var self = this;

        $("#coursegroups").empty();

        var addGroupbtn = $('<li role="presentation" id="addGroupbtn" style="margin-left: 8px;"><a class="MyCourses">&plus;</a></li>');
        addGroupbtn.click(function (event) {
            // Add One of group
            self.addGroup(1);
        });

        $("#coursegroups").append(addGroupbtn);

        this.addGroup(0, true);
        this.setGroupActive(0);
    }

    /*
        Adds a new course group of the specified type (0 for All, 1 for one, etc..)
    */
    addGroup(type, noremove) {
        // make sure we have 4 total groups or less
        if (this.courses.length <= 3) {
            var thisgroup = {"type": type, "courses": {}};
            var id = this.courses.length;
            this.courses[id] = thisgroup;

            this.generatePill(id, type, noremove);
        }

        // Remove the add button if the max group amount is exceeded
        if (this.courses.length == 4) $("#addGroupbtn").hide();
    }

    /*
        Generates, binds, and appends the given pill with the speicifed id and type
    */
    generatePill(id, type, noremove) {
        var self = this;

        var text = this.numConvert[type] + " of";

        var html = $('<li class="dropdown" groupid="' + id +'"><a style="cursor: pointer;" id="grouptext" data-toggle="dropdown" class="dropdown-toggle" href="#">' + text + '<span class="caret"></span></a><ul class="dropdown-menu" aria-labelledby="grouptext" style="min-width: 90px;"></ul></li>')
        
        html.find("a:first").click(function(e){
            // If a pill is already selected, open the dropdown
            // If not, set the pill as active

            // check if this group is already active
            var groupid = $(this).parent().attr("groupid");

            // Check if we need to set this as active
            if (groupid != self.activeGroup) {
                // we don't want the dropdown to open for this item
                e.stopPropagation();

                // check if the dropdown for the old active pill is open
                // if so, close it
                var isopen = $('li[groupid="' + self.activeGroup + '"]').hasClass("open");

                if (isopen == true) {
                    // close it
                    $('li[groupid="' + self.activeGroup + '"]').find('.dropdown-menu').dropdown('toggle');
                }

                // set this group as active
                self.setGroupActive(groupid);
            }
        });

        // Populate the dropdown
        html.find('.dropdown-menu').append(this.generatePillDropdown(noremove));

        // Bind the dropdown click handler
        html.find('li').click(function (event) {
            // find the group type
            var grouptype = $(this).attr("grouptype");
            // find the group id
            var groupid = $(this).parent().parent().attr("groupid");

            if (grouptype == -1) {
                // wants to remove this group
                self.removeGroup(groupid);
            }
            else {
                // Change the group type
                self.changeGroupType(groupid, grouptype);
            }
        });

        $("#addGroupbtn").before(html);
    }

    /*
        Removes the specified group and removes the appropriate HTML elements
    */
    removeGroup(groupid) {
        groupid = parseInt(groupid);

        // we need to remove this pill
        $('li[groupid="' + groupid + '"]').remove();

        // set the previous group to active
        this.setGroupActive(groupid-1);

        // we need to change the HTML groupid tags of the groups after this one
        if ((groupid+1) < this.courses.length) {
            // this is not the last group

            // decrement the groupid of every subsequent group
            for (var x = (groupid+1); x < this.courses.length; x++) {
                $('li[groupid="' + x + '"]').attr("groupid", x-1);
            }
        }

        // now we need to splice the array
        this.courses.splice(groupid, 1);

        // Check if we can display the add button again
        if (this.courses.length < 4) $("#addGroupbtn").show();

        // regenerate the schedules
        this.startGeneration();
    }

    /*
        Changes the type of a group type and updates the element
    */
    changeGroupType(id, type) {
        this.courses[id]["type"] = type;

        // Change the HTML
        $('li[groupid="' + id + '"]').find("a:first").html(this.numConvert[type] + ' of<span class="caret"></span>');

        this.startGeneration();
    }

    /*
        Sets the specified group to active
    */
    setGroupActive(id) {
        // remove old active class
        if (this.activeGroup != undefined) {
            $('li[groupid="' + this.activeGroup + '"]').removeClass("active");
        }
        
        this.activeGroup = id;
        $('li[groupid="' + id + '"]').addClass("active");

        // now display all the courses in the group
        this.displayGroup(this.activeGroup);
    }

    /*
        Populates the courses in the specified group
    */
    displayGroup(group) {
        var self = this;

        // empty out any current courses
        $("#courseList").empty();

        for (var course in self.courses[self.activeGroup]["courses"]) {
            var course = self.courses[self.activeGroup]["courses"][course];

            self.displayCourse(course["obj"], course["obj"]["path"]);
        }
    }

    /*
        Generates the dropdown HTML for a group pill
    */
    generatePillDropdown(noremove) {
        var html = '';

        for (var x in this.numConvert) {
            html += '<li grouptype="' + x + '"><a>' + this.numConvert[x] + ' of</a></li>';
        }

        if (noremove != true) {
            html += '<li role="separator" class="divider"></li>';
            html += '<li grouptype="-1"><a>Remove</a></li>';
        }

        return html;
    }

    /*
        Expands the type name (LEC = Lecture, TUT = Tutorial)
    */
    typeExpand(type) {
        var map = {
            "LEC": "Lecture",
            "TUT": "Tutorial",
            "LAB": "Lab",
            "SEM": "Seminar",
            "LCL": "Lecture/Lab",
            "LBL": "Lab/Lecture",
            "CLN": "Clinic"
        }

        if (map[type] != undefined) {
            return map[type];
        }
        else {
            return type;
        }
    }

    /*
        Deletes the given course in any group except the passed in one
    */
    deleteCourseFromNonSafe(delcourse, safegroup) {
        // iterate the groups
        for (var group in this.courses) {
            if (group != safegroup) {
                // we can delete in this group
                for (var course in this.courses[group]["courses"]) {
                    if (course == delcourse) {
                        delete this.courses[group]["courses"][course];
                    }
                }
            }
        }
    }

    /*
        Adds the specified course to the current active group and populates the HTML
    */
    addCourse(course, path, classid) {
        var self = this;

        // We want a separate copy of the obj to work on
        course = jQuery.extend({}, course);

        // add the path to the obj
        course["path"] = path;

        var subject = path.split("\\");

        var coursenum = subject[subject.length-1] // 203
        var subject = subject[subject.length-2]; // CPSC

        var coursecode = subject + " " + coursenum; // CPSC 203


        // Add the key if it isn't there
        if (self.courses[self.activeGroup]["courses"][coursecode] == undefined) {
            self.courses[self.activeGroup]["courses"][coursecode] = {};
            self.courses[self.activeGroup]["courses"][coursecode]["types"] = {};

            // add the possible types
            for (var classv in course["classes"]) {
                if (course["classes"][classv]["type"] != undefined) {
                    var thistype = course["classes"][classv]["type"];
                    self.courses[self.activeGroup]["courses"][coursecode]["types"][thistype] = true;
                }
            }

            // check to see if any other groups have this course, is so, delete the course from them
            self.deleteCourseFromNonSafe(coursecode, self.activeGroup);

            self.displayCourse(course, path, undefined, true);
        }

        var thiscourse = self.courses[self.activeGroup]["courses"][coursecode];

        // set the course obj
        thiscourse["obj"] = course;

        if (classid != undefined) {
            var classtype = true;

            // figure out the class type
            for (var classv in course["classes"]) {
                if (course["classes"][classv]["id"] == classid) {
                    classtype = course["classes"][classv]["type"];
                    break;
                }
            }

            if (thiscourse["types"][classtype] != true) {
                // update the class list button (remove the old class button)
                window.classList.updateRemovedClass(thiscourse["types"][classtype]);
            }

            thiscourse["types"][classtype] = classid;

            // Update the accordion if its open
            self.updateAccordion(coursecode);

            // update the classlist buttons
            window.classList.updateAddedCourse(coursecode);
        }

        this.startGeneration();
    }

    /*
        Updates the data in the given open accordion
    */
    updateAccordion(course) {
        var self = this;

        // get the label
        var label = $('label[path="' + course + '"]');

        // Check if its open
        if (label.attr("accordopen") == "true") {
            // update it
            label.attr("accordopen", "false");
            label.parent().find("ul:first").slideUp(function () {
                $(this).empty();
                self.bindButton(label, "course");
            });
        }
    }

    /*
        Removes a course from the UI and courses obj
    */
    removeCourse(course) {
        for (var group in this.courses) {
            var thisgroup = this.courses[group];

            if (thisgroup["courses"][course] != undefined) {

                // Remove any remove class buttons since those classes are no longer added
                for (var classval in thisgroup["courses"][course]["types"]) {
                    var thisclassval = thisgroup["courses"][course]["types"][classval];

                    if (thisclassval != true) {
                        window.classList.updateRemovedClass(thisclassval);
                    }
                }

                // Delete this course
                delete thisgroup["courses"][course];

                // check if its the active group
                // if so, remove the UI element
                if (group == this.activeGroup) {
                    var label = $('label[path="' + course + '"]');
                    label.parent().slideUp(function () {
                        $(this).empty();
                    });
                }
            }
        }

        // Restart generation
        this.startGeneration();
    }

    /*
        Returns a boolean as to whether a specified course is in any selected group
    */
    hasCourse(course) {
        for (var group in this.courses) {
            var thisgroup = this.courses[group];

            if (thisgroup["courses"][course] != undefined) {
                return true;
            }
        }

        // We didn't find a result
        return false;
    }

    /*
        Returns a boolean as to whether the specified class id has been selected in any group
    */
    hasClass(classid) {
        for (var group in this.courses) {
            var thisgroup = this.courses[group];

            for (var course in thisgroup["courses"]) {
                for (var classv in thisgroup["courses"][course]["types"]) {
                    if (thisgroup["courses"][course]["types"][classv] == classid) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /*
        Removes the specified class from the UI and generation
    */
    removeClass(classid) {
        for (var group in this.courses) {
            var thisgroup = this.courses[group];

            for (var course in thisgroup["courses"]) {
                for (var classv in thisgroup["courses"][course]["types"]) {
                    if (thisgroup["courses"][course]["types"][classv] == classid) {
                        thisgroup["courses"][course]["types"][classv] = true;

                        // update UI
                        this.updateAccordion(course);

                        // update the generation
                        this.startGeneration();

                        return true;
                    }
                }
            }
        }

        return false;
    }

    /*
        Appends the given course to the current courselist HTML
    */
    displayCourse(course, path, classid, animated) {
        var self = this;

        var html = "";
        if (classid == undefined) {
            html = $(this.generateCourseHTML(course, path));

            html.find("label").click(function (event) {
                event.stopPropagation();
                self.bindButton(this, "course");
            });

            // bind remove button
            html.find(".removeBtn").click(function (event) {
                event.stopPropagation();
                
                var coursecode = $(this).parent().attr("path");

                // remove the course in My Courses
                self.removeCourse(coursecode);

                // we want to update the general course remove button
                window.classList.updateRemovedCourse($(this).parent().attr("path"));
            })
        }

        if (animated) {
            html.hide().prependTo("#courseList").slideDown();
        }
        else {
            $("#courseList").prepend(html);
        }
    }

    /*
        Binds an accordion click
    */
    bindButton(button, type) {
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
            var thispath = $(button).attr("path");
            $(button).attr("accordopen", "true");

            var element = $(button).parent().find("ul");

            // Populate depending on type
            if (type == "course") {
                // Element to populate
                self.displayCourseDropDown(element, thispath);
            }
        }
    }

    /*
        Generates the dropdown when clicking on a course in MyCourses
    */
    displayCourseDropDown(element, coursecode) {
        var self = this;

        element.slideUp(function () {
            
            var thiscourse = self.courses[self.activeGroup]["courses"][coursecode];

            // iterate through each class type
            for (var type in thiscourse["types"]) {
                var thistype = thiscourse["types"][type];
                if (thistype == true) {
                    // They don't have a specific selection, we'll have to generate it
                    var html = '<div class="accordiondesc" style="padding-left: 50px;" type="' + type + '">' + self.typeExpand(type) + '</div>';
                    element.append(html);
                }
                else if (thistype != false) {
                    // this is a specific class

                    // find the obj of the class
                    var data = {"classes": []};

                    for (var classv in thiscourse["obj"]["classes"]) {
                        var thisclass = thiscourse["obj"]["classes"][classv];
                        if (thisclass["id"] == thistype) {
                            // we found the obj for this class
                            data["classes"].push(thisclass);
                            break;
                        }
                    }

                    if (data["classes"].length > 0) {
                        // generate the table
                        var html = window.classList.generateClasses(data, element, false, false);

                        // add the remove button
                        var removebtn = $('<td><button class="btn btn-default" id="removeClassBtn" type="' + type +'" code="' + coursecode + '" myclassid="' + data["classes"][0]["id"] + '">×</button></td>');

                        // bind class removing button
                        removebtn.find("button").click(function (event) {
                            event.stopPropagation();
                            var type = $(this).attr("type");
                            var coursecode = $(this).attr("code");
                            
                            // set to generic class
                            self.courses[self.activeGroup]["courses"][coursecode]["types"][type] = true;

                            // update the class list
                            window.classList.updateRemovedClass($(this).attr("myclassid"));

                            // update UI
                            self.updateAccordion(coursecode);

                            // update the generation
                            self.startGeneration();
                        })

                        html.find("tr:first").append(removebtn);
                        // <div class="removeBtn">×</div>

                        // edit the css
                        html.css("padding-left", "50px");
                        html.css("padding-right", "15px");
                    }
                }
            }

            element.slideDown();
        });
    }

    /*
        Initiates schedule generation given the current chosen classes
    */
    startGeneration() {
        // we want to terminate the previous generator if its still running
        if (this.generator != false) this.generator.stop();

        // generate the schedules
        this.generator = new Generator(this.courses);
    }

    /*
        Generates the course HTML
    */
    generateCourseHTML(course, path) {
        var subject = path.split("\\");
        var coursenum = subject[subject.length-1]
        var subject = subject[subject.length-2];

        var title = subject + " " + coursenum;

        if (course["description"] != undefined && course["description"]["name"] != undefined) {
            title += " - " + course["description"]["name"];
        }

        return this.generateAccordionHTML(title, subject + " " + coursenum);
    }

    /*
        Generates the course remove button HTML
    */
    generateRemoveButton() {
        return '<button class="btn btn-default">&times;</button>';
    }

    /*
        Generates the general accordian structure HTML given a value
    */
    generateAccordionHTML(value, path) {
        return '<li class="has-children"><label path="' + path +'" accordopen="false">' + value + '<div class="removeBtn">×</div></label><ul></ul></li>';
    }
}