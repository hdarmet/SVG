Vue.component('generate-fixings', {
    data() {
        return {
            boxWidth: 120,
            boxHeight: 70,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            visible: false,
            onValidate: undefined,
            onCancel: undefined
        };
    },
    created() {
        generateFixingsWidget = this;
    },
    methods: {
        validate() {
            this.onValidate({
                boxWidth: parseInt(this.boxWidth),
                boxHeight: parseInt(this.boxHeight),
                left: parseInt(this.left),
                right: parseInt(this.right),
                top: parseInt(this.top),
                bottom: parseInt(this.bottom)
            });
            this.visible = false;
        },
        cancel() {
            this.onCancel();
            this.visible = false;
        }
    },
    template:
        `<div class="plano_modal" v-show="visible" style="position:absolute; left:200px; top:100px; width:450px;">
            <b-card>
              <label> <h3>Generate Fixings</h3> </label>
              <b-container fluid>
                <b-row>
                  <b-col sm="4"> <label>Box Width:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="boxWidth"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Box Height:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="boxHeight"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Left:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="left"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Right:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="right"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Top:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="top"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Bottom:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="bottom"></b-form-input>
                  </b-col>
                </b-row>
              </b-container>
              <b-button-toolbar>
                <b-button style="margin:5px;" variant="primary" @click="validate();"
                  >Ok</b-button
                >
                <b-button style="margin:5px;" @click="cancel();">Cancel</b-button>
              </b-button-toolbar>
            </b-card>
          </div>`
});

var generateFixingsWidget;
window.generateFixings = function generateFixings(data, onValidate, onCancel) {
    console.log("generate fixings !!")
    generateFixingsWidget.left = -data.width / 2 + 5 + 120 / 2;
    generateFixingsWidget.right = data.width / 2 - 5 - 120 / 2;
    generateFixingsWidget.top = -data.height / 2 + 5 + 70 / 2;
    generateFixingsWidget.bottom = data.height / 2 - 5 - 70 / 2;
    generateFixingsWidget.visible = true;
    generateFixingsWidget.onValidate = onValidate;
    generateFixingsWidget.onCancel = onCancel;
};

Vue.component('generate-hooks', {
    data() {
        return {
            blisterWidth:70,
            blisterHeight: 120,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            visible: false,
            onValidate: undefined,
            onCancel: undefined
        };
    },
    created() {
        generateHooksWidget = this;
    },
    methods: {
        validate() {
            this.onValidate({
                blisterWidth: parseInt(this.blisterWidth),
                blisterHeight: parseInt(this.blisterHeight),
                left: parseInt(this.left),
                right: parseInt(this.right),
                top: parseInt(this.top),
                bottom: parseInt(this.bottom)
            });
            this.visible = false;
        },
        cancel() {
            this.onCancel();
            this.visible = false;
        }
    },
    template:
        `<div class="plano_modal" v-show="visible" style="position:absolute; left:200px; top:100px; width:450px;">
            <b-card>
              <label> <h3>Generate Hooks</h3> </label>
              <b-container fluid>
                <b-row>
                  <b-col sm="4"> <label>Blister Width:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="blisterWidth"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Blister Height:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="blisterHeight"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Left:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="left"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Right:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="right"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Top:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="top"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Bottom:</label> </b-col>
                  <b-col sm="8">
                    <b-form-input type="number" v-model="bottom"></b-form-input>
                  </b-col>
                </b-row>
              </b-container>
              <b-button-toolbar>
                <b-button style="margin:5px;" variant="primary" @click="validate();"
                  >Ok</b-button
                >
                <b-button style="margin:5px;" @click="cancel();">Cancel</b-button>
              </b-button-toolbar>
            </b-card>
          </div>`
});

var generateHooksWidget;
window.generateHooks = function generateHooks(data, onValidate, onCancel) {
    console.log("generate fixings !!")
    generateHooksWidget.left = -data.width / 2 + 5 + 70 / 2;
    generateHooksWidget.right = data.width / 2 - 5 - 70 / 2;
    generateHooksWidget.top = -data.height / 2 + 5 + 120 / 2;
    generateHooksWidget.bottom = data.height / 2 - 5 - 120 / 2;
    generateHooksWidget.visible = true;
    generateHooksWidget.onValidate = onValidate;
    generateHooksWidget.onCancel = onCancel;
};

new Vue({
    el: '#edit',
    template: `
    <div style="position:relative;">
    	<generate-fixings></generate-fixings>
    	<generate-hooks></generate-hooks>
    </div>
`
});