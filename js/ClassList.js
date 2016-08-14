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

        $("#courseSelector").slideUp(function () {
            $("#courseSelector").empty();

            $.getJSON(self.baseURL + "unis/" + self.uni + "/" + self.term + "/all", function(data) {
                self.populateClasses(data["classes"], $("#courseSelector"), 0);
                $("#courseSelector").slideDown();

                self.bindSearch();
            });
        });
    }

    /*
        Recursively populates the class list
    */
    populateClasses(data, element, depth) {
        var self = this;
        if (depth < 3 && data != undefined && data["classes"] == undefined) {
            for (var val in data) {
                if (val != "description") {
                    // Check whether there is a name for this
                    var name = val;
                    if (data[val]["description"] != undefined  && data[val]["description"]["name"] != undefined) {
                        name += " - " + data[val]["description"]["name"];
                    }
                    var thiselement = $(self.generateAccordionHTML(name));
                    element.append(thiselement);

                    //console.log(val);

                    self.populateClasses(data[val], thiselement.find("ul").first(), depth+1);
                }
            }
        }
    }


    bindSearch() {
        $('#search-headers').hideseek({
            highlight: true,
            min_chars: 3
        });

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
        }
    }
    /*
        Generates the general accordian structure HTML given a value
    */
    generateAccordionHTML(value) {
        return '<li class="has-children"><input type="checkbox" name ="' + value 
        + '" id="' + value + '"><label for="' + value + '">' + value + '</label><ul></ul></li>';
    }
}