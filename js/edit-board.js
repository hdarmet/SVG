
Vue.component('generate-targets', {
    data: function() {
        return {
            x:0,
            visible:false,
            onValidate:null,
            onCancel:null
        }
    },
    created: function() {
        generateTargetsWidget = this;
    },
    methods: {
        validate() {
            this.onValidate({
                x: parseInt(this.x)
            });
            this.visible = false;
        },
        cancel() {
            this.onCancel();
            this.visible = false;
        }
    },
    template:
        `<div v-show="visible" style="position:absolute; left:200px; top:100px;">
        <b-card>
          <label><h3>Generate Targets</h3></label>
          <b-container fluid>
            <b-row>
              <b-col sm="4">
                <label>X:</label>
              </b-col>
              <b-col sm="8">
                <b-form-input type="number" v-model="x"></b-form-input>
              </b-col>
            </b-row>
          </b-container>
          <b-button-toolbar>
            <b-button style="margin:5px;" variant="primary" @click="validate();">Ok</b-button>   
            <b-button style="margin:5px;" @click="cancel();">Cancel</b-button>
          </b-button-toolbar>
        </b-card>
    </div>`
});

var generateTargetsWidget;
function generateTargets(data, onValidate, onCancel) {
    generateTargetsWidget.x = data.x;
    generateTargetsWidget.visible = true;
    generateTargetsWidget.onValidate = onValidate;
    generateTargetsWidget.onCancel = onCancel;
}

new Vue({
    el: '#edit',
    template:
    `<div style="position:relative;">
    	<generate-targets></generate-targets>
    </div>`
});
