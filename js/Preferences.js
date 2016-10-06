class Preferences {
    constructor() {
        this.instantiateSliders();
        this.loadPreferences();

        // Update the Uni, remove needless options on start
        this.updatedUni();
    }

    instantiateSliders() {
        var self = this;

        self.morningslider = $('#slider_morning').slider()
                                .on('slideStop', function () {
                                    self.savePreferences();
                                });

        self.nightslider = $('#slider_night').slider()
                                .on('slideStop', function () {
                                    self.savePreferences();
                                });
        self.consecutiveslider = $('#slider_consecutive').slider()
                                .on('slideStop', function () {
                                    self.savePreferences();
                                });
        self.rmpslider = $('#slider_rmp').slider()
                                .on('slideStop', function () {
                                    self.savePreferences();
                                });

        // Bind checkbox change event
        $("#onlyOpenCheckbox").change(function () {
            self.savePreferences();
        })

        // Bind Engineering student change event
        $("#engineeringCheckbox").change(function(){
            console.log("Hello?");
            self.savePreferences(true);
        })
    }

    /*
        Hides/shows different preferences based upon the current uni selected
    */
    updatedUni(newuni) {
        $("#engineeringCheckbox").parent().hide();

        if (newuni == "UAlberta") {
            $("#engineeringCheckbox").parent().show();
        }
    }

    getMorningValue() {
        return this.morningslider.slider('getValue');
    }

    getNightValue() {
        return this.nightslider.slider('getValue');
    }

    getConsecutiveValue() {
        return this.consecutiveslider.slider('getValue');
    }

    getRMPValue() {
        return this.rmpslider.slider('getValue');
    }

    getOnlyOpenValue() {
        return $("#onlyOpenCheckbox").is(":checked");
    }

    getEngineeringValue() {
        return $('#engineeringCheckbox').is(':checked');
    }
    
    setMorningValue(value) {
        if (value != null) this.morningslider.slider('setValue', parseInt(value));
    }

    setNightValue(value) {
        if (value != null) this.nightslider.slider('setValue', parseInt(value));
    }

    setConsecutiveValue(value) {
        if (value != null) this.consecutiveslider.slider('setValue', parseInt(value));
    }

    setRMPValue(value) {
        if (value != null) this.rmpslider.slider('setValue', parseInt(value));
    } 

    setOnlyOpenValue(value) {
        if (value != null) $("#onlyOpenCheckbox").attr("checked", (value === "true"));
    }

    setEngineeringValue(value) {
        if (value != null) $("#engineeringCheckbox").attr("checked", (value === "true"));
    }

    /*
        Saves the current slider values to localStorage
    */
    savePreferences(regenerate) {
        localStorage.setItem('morningslider', this.getMorningValue());
        localStorage.setItem('nightslider', this.getNightValue());
        localStorage.setItem('consecutiveslider', this.getConsecutiveValue());
        localStorage.setItem('rmpslider', this.getRMPValue());
        localStorage.setItem('onlyOpenCheckbox', this.getOnlyOpenValue());
        localStorage.setItem('engineeringCheckbox', this.getEngineeringValue());

        console.log("Saving preferences");
        // update any current schedule generation
        if (window.mycourses.generator != false) {
            if (regenerate != true) {
                console.log("Updating scorer");
                // update the scores
                window.mycourses.generator.updateScores();
            }
            else {
                console.log("Updating generation");
                window.mycourses.startGeneration();
            }
        }
    }

    /*
        If there are saved preferences in localStorage, this loads them
    */
    loadPreferences() {
        this.setMorningValue(localStorage.getItem('morningslider'));
        this.setNightValue(localStorage.getItem('nightslider'));
        this.setConsecutiveValue(localStorage.getItem('consecutiveslider'));
        this.setRMPValue(localStorage.getItem('rmpslider'));
        this.setOnlyOpenValue(localStorage.getItem('onlyOpenCheckbox'));
        this.setEngineeringValue(localStorage.getItem('engineeringCheckbox'));
    }
}