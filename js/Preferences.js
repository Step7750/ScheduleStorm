class Preferences {
    constructor() {
        this.instantiateSliders();
    }

    instantiateSliders() {
        $('#slider_morning').slider({
            formatter: function (value) {
                return 'Current value: ' + value;
            }
        });

        $('#slider_consecutive').slider({
            formatter: function (value) {
                return 'Current value: ' + value;
            }
        });

        $('#slider_night').slider({
            formatter: function (value) {
                return 'Current value: ' + value;
            }
        });

        $('#slider_rmp').slider({
            formatter: function (value) {
                return 'Current value: ' + value;
            }
        });
    }
}