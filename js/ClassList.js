class ClassList {
    constructor(uni, term) {

        this.baseURL = "http://api.schedulestorm.com:5000/v1/";

        this.uni = uni;
        this.term = term;
        this.location = location;

        this.getClasses();
    }

    /*
        Retrieves the class list and populates the classes accordion
    */
    getClasses() {
        var self = this;

        $("#classdata").fadeOut(function () {
            // Add loading animation
            var loading = new Loading($("#courseSelector"), "Loading Course Data...");

            // Get the class data
            $.getJSON(self.baseURL + "unis/" + self.uni + "/" + self.term + "/all", function(data) {
                self.classdata = data["classes"];
                self.rmpdata = data["rmp"];

                loading.remove(function () {
                    // Remove the loading animation and populate the list
                    self.populateClassList(data["classes"], $("#courseSelector").find("#classdata"), "");
                });
            });
        });
    }

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

        if (desc["prereq"] != undefined) {
            html += "<br>Prereq: " + desc["prereq"] + "<br>";
        }

        if (desc["coreq"] != undefined) {
            html += "<br>Coreq: " + desc["coreq"] + "<br>";
        }

        if (desc["antireq"] != undefined) {
            html += "<br>Antireq: " + desc["antireq"] + "<br>";
        }

        if (desc["notes"] != undefined && desc["notes"] != "") {
            html += "<br>Notes: " + desc["notes"];
        } 


        return html;
    }

    populateClass(data, element) {
        if (data["description"] != undefined) {
            element.append(this.generateClassDesc(data["description"]));
        }
        console.log(data);
    }
    /*
        Populates the classlist on demand given the hierarchy
    */
    populateClassList(data, element, path) {
        var self = this;

        // Slide up the element
        element.slideUp(function () {
            for (var val in data) {
                if (val == "classes") {
                    // This is a class, process it differently
                    self.populateClass(data, element)
                }
                else if (val != "description") {
                    // Generate this new element, give it the path
                    var thispath = path + "\\" + val;

                    var name = val;

                    if (data[val]["description"] != undefined) {
                        if (data[val]["description"]["name"] != undefined) {
                            name += " - " + data[val]["description"]["name"]
                        }
                    }

                    var thiselement = $(self.generateAccordionHTML(name, thispath));

                    thiselement.find("label").click(function () {
                        // Onclick handler

                        // do we need to close the element?
                        if ($(this).attr("accordopen") == "true") {
                            // Close the element
                            $(this).attr("accordopen", "false");
                            $(this).parent().find("ul").slideUp(function () {
                                $(this).empty();
                            })

                        }
                        else {
                            // Open accordion
                            var thispath = $(this).attr("path").split("\\");
                            $(this).attr("accordopen", "true");

                            // Element to populate
                            var element = $(this).parent().find("ul");

                            // want to find the data to populate
                            var thisdata = self.classdata;
                            for (var key in thispath) {
                                if (key > 0) {
                                    thisdata = thisdata[thispath[key]];
                                }
                            }
                            
                            // Populate the element
                            self.populateClassList(thisdata, element, $(this).attr("path"));
                        }
                        

                    });
                    element.append(thiselement);
                }
            }

            element.slideDown();


        });
    }


    bindSearch() {
        $('#search-headers').hideseek({
            highlight: true,
            min_chars: 3
        });

        /*
        var accordionsMenu = $('.cd-accordion-menu');

        if( accordionsMenu.length > 0 ) {

            accordionsMenu.each(function(){
                var accordion = $(this);
                //detect change in the input[type="checkbox"] value
                accordion.on('change', 'input[type="checkbox"]', function(){
                    var checkbox = $(this);
                    ( checkbox.prop('checked') ) ? checkbox.siblings('ul').attr('style', 'display:none;').slideDown(300) : checkbox.siblings('ul').attr('style', 'display:block;').slideUp(300);
                });
            });
        }*/
    }

    /*
        Generates the general accordian structure HTML given a value
    */
    generateAccordionHTML(value, path) {
        return '<li class="has-children"><label path="' + path +'" accordopen="false">' + value + '</label><ul></ul></li>';
    }
}