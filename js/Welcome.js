class Welcome {

    constructor() {
        this.baseURL = "http://api.schedulestorm.com:5000/v1/";
        // We want to get the list of Unis
        this.getUnis();
    }

    /*
        Obtains the University list from the API server 
    */
    getUnis() {
        var thisobj = this;
        $.getJSON(this.baseURL + "unis", function(data) {
            $("#welcomeModal").modal({
                backdrop: 'static',
                keyboard: false
            });
            window.unis = data;
            thisobj.unis = data;
            thisobj.populateUnis(data);
        });
    }

    /*
        Populates the modal with the Unis
    */
    populateUnis(unis) {
        var thisobj = this;

        var list = $("#uniModalList").find("#dataList");
        list.empty();
        var wantedText = $("#uniModalList").find("#wantedData");

        wantedText.text("Please choose your University:");

        // Iterate through the unis and add the buttons
        for (var uni in unis) {
            var button = $(this.createButton(unis[uni]["name"], uni));
            button.click(function() {

                thisobj.uni = $(this).attr("value");
                $("#MyUniversity").hide().html(thisobj.uni + " <span class='caret'></span>").fadeIn('slow');

                $("#uniModalList").slideUp(function () {
                    thisobj.displayTerms(thisobj.uni);
                });
            });

            list.append(button);
        }
        
    }

    /*
        Displays the terms to the user
    */
    displayTerms(uni) {
        var thisobj = this; // Keep the reference

        var list = $("#uniModalList").find("#dataList");
        list.empty();
        var wantedText = $("#uniModalList").find("#wantedData");

        wantedText.text("Please choose your term:");

        for (var term in this.unis[uni]["terms"]) {
            var button = $(this.createButton(this.unis[uni]["terms"][term], term));

            button.click(function() {

                thisobj.term = $(this).attr("value");

                $("#welcomeModal").modal('hide');
            });
            list.append(button);
        }

        $("#uniModalList").slideDown();
    }

    /*
        Returns the text for an HTML button given text, value
    */
    createButton(text, value) {
        return '<button type="button" class="btn btn-default" value="' + value +'">' + text + '</button>'
    }
}
