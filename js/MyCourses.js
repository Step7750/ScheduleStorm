class MyCourses {
    constructor(uni, term) {
        // TODO: Add saving courses, currently uni and term are redundant
        this.courses = [];
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

        this.addGroup(0);
        this.setGroupActive(0);
    }

    /*
        Adds a new course group of the specified type (0 for All, 1 for one, etc..)
    */
    addGroup(type) {
        // make sure we have 4 total groups or less
        if (this.courses.length <= 3) {
            var thisgroup = {"type": type, "courses": {}};
            var id = this.courses.length;
            this.courses[id] = thisgroup;

            this.generatePill(id, type);
        }
    }

    /*
        Generates, binds, and appends the given pill with the speicifed id and type
    */
    generatePill(id, type) {
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
        html.find('.dropdown-menu').append(this.generatePillDropdown());

        // Bind the dropdown click handler
        html.find('li').click(function (event) {
            // find the group type
            var grouptype = $(this).attr("grouptype");
            // find the group id
            var groupid = $(this).parent().parent().attr("groupid");

            // Change the group type
            self.changeGroupType(groupid, grouptype);
        });

        $("#addGroupbtn").before(html);
    }

    /*
        Changes the type of a group type and updates the element
    */
    changeGroupType(id, type) {
        this.courses[id]["type"] = type;

        // Change the HTML
        $('li[groupid="' + id + '"]').find("a:first").html(this.numConvert[type] + ' of<span class="caret"></span>');
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
    generatePillDropdown() {
        var html = '';

        for (var x in this.numConvert) {
            html += '<li grouptype="' + x + '"><a>' + this.numConvert[x] + ' of</a></li>';
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
            "LAB": "Lab"
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

            self.displayCourse(course, path);
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

            thiscourse["types"][classtype] = classid;
        }
    }

    /*
        Appends the given course to the current courselist HTML
    */
    displayCourse(course, path, classid) {
        var self = this;

        var html = "";
        if (classid == undefined) {
            html = $(this.generateCourseHTML(course, path));

            html.find("label").click(function (event) {
                event.stopPropagation();
                self.bindButton(this, "course");
            });
        }

        $("#courseList").prepend(html);
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
                    var html = '<div class="accordiondesc" style="padding-left: 50px;">' + self.typeExpand(type) + '</div>';
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
                        // edit the css
                        html.css("padding-left", "50px");
                        html.css("padding-right", "40px");
                    }
                }
            }

            element.slideDown();
        });
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
        return '<li class="has-children"><label path="' + path +'" accordopen="false">' + value + '</label><ul></ul></li>';
    }
}