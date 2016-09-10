class Preferences {
    constructor() {
        this.instantiateSliders();
    }

    instantiateSliders() {
        this.morningslider = $('#slider_morning').slider();
        this.nightslider = $('#slider_night').slider();
        this.consecutiveslider = $('#slider_consecutive').slider();
        this.rmpslider = $('#slider_rmp').slider();
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
}