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

    addGroup(type) {
        // make sure we have 4 total groups or less
        if (this.courses.length <= 3) {
            var thisgroup = {"type": type, "courses": []};
            var id = this.courses.length;
            this.courses[id] = thisgroup;

            this.generatePill(id, type);
        }
    }

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

    changeGroupType(id, type) {
        this.courses[id]["type"] = type;

        // Change the HTML
        $('li[groupid="' + id + '"]').find("a:first").html(this.numConvert[type] + ' of<span class="caret"></span>');
    }

    setGroupActive(id) {
        // remove old active class
        if (this.activeGroup != undefined) {
            $('li[groupid="' + this.activeGroup + '"]').removeClass("active");
        }
        
        this.activeGroup = id;
        $('li[groupid="' + id + '"]').addClass("active");
    }

    generatePillDropdown() {
        var html = '';

        for (var x in this.numConvert) {
            html += '<li grouptype="' + x + '"><a>' + this.numConvert[x] + ' of</a></li>';
        }

        return html;
    }

}