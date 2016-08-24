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
            var thisgroup = {"type": type, "courses": []};
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

            if (course["classid"] == undefined) {
                self.displayCourse(course, course["path"]);
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
        // Adds the given course to the current active group
        // If classid is undefined, this is a general course, not a class
        var self = this;

        course = jQuery.extend({}, course);
        
        course["path"] = path;
        if (classid != undefined) {
            course["classid"] = classid;
        }
        self.courses[self.activeGroup]["courses"].push(course);

        self.displayCourse(course, path, classid);

    }

    /*
        Appends the given course to the current courselist HTML
    */
    displayCourse(course, path, classid) {
        var html = "";
        if (classid == undefined) {
            html = this.generateCourseHTML(course, path);
        }
        else {
            console.log("Class");
        }

        $("#courseList").append(html);

    }

    /*
        Generates the course HTML
    */
    generateCourseHTML(course, path) {
        var subject = path.split("\\");
        var coursenum = subject[subject.length-1]
        var subject = subject[subject.length-2];
        var html = '<div class="col-xs-6 courseColor"><table class="table"><tbody><tr>';
        html += '<td>' + subject + ' ' + coursenum;

        if (course["description"] != undefined && course["description"]["name"] != undefined) {
            html += ' - ' + course["description"]["name"];
        }

        if (course["classes"] != undefined) {
            // Show the user which types of classes we'll need to fill in (lab, lec, tut, etc...)
            var foundTypes = [];

            for (var classv in course["classes"]) {
                if (course["classes"][classv]["type"] != undefined) {
                    if ($.inArray(course["classes"][classv]["type"], foundTypes) == -1) {
                        // add it
                        foundTypes.push(course["classes"][classv]["type"]);
                    }
                }
            }

            if (foundTypes.length > 0) {
                html += " -";
                for (var type in foundTypes) {
                    html += " " + foundTypes[type];
                }
            }
        }

        html += '</td>';

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