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

        var html = $('<li class="dropdown" groupid="' + id +'"><a style="cursor: pointer;" id="grouptext">' + text + '<span class="caret largecaret"></span></a><ul class="dropdown-menu" style="min-width: 90px;"></ul></li>')
        

        html.find("span").click(function(){
            // bind bootstrap dropdown toggle
            $(this).parent().parent().find(".dropdown-menu").toggle();
        });

        html.find("#grouptext").click(function(){
            // set this group as active
            // find this id
            var groupid = $(this).parent().attr("groupid");
            self.setGroupActive(groupid);
        });

        html.find('.dropdown-menu').append(this.generatePillDropdown());

        // Bind the dropdown click handler
        html.find('li').click(function (event) {
            // toggle dropdown
            $(this).parent().toggle();

            // find the group type
            var grouptype = $(this).attr("grouptype");
            // find the group id
            var groupid = $(this).parent().parent().attr("groupid");

            self.changeGroupType(groupid, grouptype);
        });

        $("#addGroupbtn").before(html);
    }

    changeGroupType(id, type) {
        this.courses[id]["type"] = type;

        // Change the HTML
        $('li[groupid="' + id + '"]').find("a:first").html(this.numConvert[type] + ' of<span class="caret largecaret"></span>');

        $('li[groupid="' + id + '"]').find("a:first").find("span").click(function(){
            // bind bootstrap dropdown toggle
            $(this).parent().parent().find(".dropdown-menu").toggle();
        });
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