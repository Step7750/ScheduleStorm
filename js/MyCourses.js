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
            course = self.courses[self.activeGroup]["courses"][course];

            for (var type in course["types"]) {
                if (course["types"][type] == true) {
                    // this is a general course
                    self.displayCourse(course["obj"], course["obj"]["path"], type);
                }
                else if (course["types"][type] != false) {
                    // we have to find the class obj
                    for (var classv in course["obj"]["classes"]) {
                        if (course["obj"]["classes"][classv]["id"] == course["types"][type]) {
                            // found the obj, draw the class
                            self.displayCourse(course["obj"]["classes"][classv], course["obj"]["path"], type, course["types"][type]);
                            break;
                        }
                    }
                }
            }
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
        }

        var thiscourse = self.courses[self.activeGroup]["courses"][coursecode];

        // set the course obj
        thiscourse["obj"] = course;

        if (classid == undefined) {
            // they just added a general course

            // figure out what labs, tutorials, etc.. there are
            for (var classv in course["classes"]) {
                if (course["classes"][classv]["type"] != undefined) {
                    var thistype = course["classes"][classv]["type"];

                    if (thiscourse["types"][thistype] == undefined) {
                        thiscourse["types"][thistype] = true;
                        // add the HTML
                        self.displayCourse(course, path, thistype);
                    }
                }
            }

        }
        else {
            var classtype = true;

            // figure out the class type
            for (var classv in course["classes"]) {
                if (course["classes"][classv]["id"] == classid) {
                    classtype = course["classes"][classv]["type"];
                    break;
                }
            }

            if (thiscourse["types"][classtype] != classid) {
                // draw it
                self.displayCourse(course, path, classtype, classid);
            }

            thiscourse["types"][classtype] = classid;
        }
    }

    /*
        Appends the given course to the current courselist HTML
    */
    displayCourse(course, path, type, classid) {
        var html = "";
        if (classid == undefined) {
            html = this.generateCourseHTML(course, path, type);
        }
        else {
            console.log("Class");
            html = this.generateClassHTML(course, path, classid);
        }

        $("#courseList").prepend(html);

    }

    /*
        Generates the course HTML
    */
    generateCourseHTML(course, path, type) {
        var subject = path.split("\\");
        var coursenum = subject[subject.length-1]
        var subject = subject[subject.length-2];

        var html = '<div class="courseColor"><table class="table"><tbody><tr>';
        html += '<td>' + subject + ' ' + coursenum;

        if (course["description"] != undefined && course["description"]["name"] != undefined) {
            html += ' - ' + course["description"]["name"];
        }

        if (type != undefined) {
            html += ' - ' + type;
        }

        html += '</td>';

        html += '<td>' + this.generateRemoveButton() + '</td>'

        html += '</tr></tbody></table></div>';

        return html
    }


    /*
        Generates the class HTML
    */
    generateClassHTML(course, path, id) {
        // find the class
        for (var classv in course["classes"]) {
            if (course["classes"][classv]["id"] == id) {
                course = course["classes"][classv];
                break
            }
        }

        var subject = path.split("\\");
        var coursenum = subject[subject.length-1]
        var subject = subject[subject.length-2];

        var html = '<div class="courseColor"><table class="table"><tbody><tr>';
        html += '<td>' + subject + ' ' + coursenum + '</td>';

        html += '<td>' + course["type"] + "-" + course["group"] + " (" + id + ")" + '</td>';

        var teachers = "";
        for (var teacher in course["teachers"]) {
            if (teacher > 0) {
                teachers += "<br>";
            }
            teacher = course["teachers"][teacher];

            // want to find RMP rating
            var rating = "";
            if (window.classList.rmpdata[teacher] != undefined) {
                rating = window.classList.rmpdata[teacher]["rating"];
            }

            if (teacher != "Staff") {
                teacher = ClassList.abbreviateName(teacher);
            }

            teachers += teacher;

            if (rating != "") {
                teachers += " (" + rating + ")";
            }
        }

        html += "<td style='width: 20%;'>" + teachers + "</td>";

        html += '<td style="width: 30%;">' + course["times"].join("<br>") + "</td>";

        html += '<td>' + course["rooms"].join("<br>") + "</td>";

        html += '<td>' + this.generateRemoveButton() + '</td>'

        html += '</tr></tbody></table></div>';

        return html
    }

    /*
        Generates the course remove button HTML
    */
    generateRemoveButton() {
        return '<button class="btn btn-default">&times;</button>';
    }

}