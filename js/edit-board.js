
Vue.component('generate-hex-targets', {
    components: { Swatches:window.VueSwatches.default },
    data: function() {
        return {
            colCount:0,
            rowCount:0,
            type:1,
            color:null,
            visible:false,
            onValidate:null,
            onCancel:null
        }
    },
    created: function() {
        generateHexTargetsWidget = this;
    },
    methods: {
        selectType(type) {
          this.type = type;
        },
        validate() {
            this.onValidate({
                colCount: parseInt(this.colCount),
                rowCount: parseInt(this.rowCount),
                type: parseInt(this.type)
            });
            this.visible = false;
        },
        cancel() {
            this.onCancel();
            this.visible = false;
        }
    },
    template:
        `<div v-show="visible" style="position:absolute; left:200px; top:100px; width:620px;">
        <b-card>
          <label><h3>Generate Hex Targets</h3></label>
          <b-container fluid>
            <b-row>
              <b-col md="3">
                <label>Col Count:</label>
              </b-col>
              <b-col md="3">
                <b-form-input type="number" v-model="colCount"></b-form-input>
              </b-col>
              <b-col md="3">
                <label>Row Count:</label>
              </b-col>
              <b-col md="3">
                <b-form-input type="number" v-model="rowCount"></b-form-input>
              </b-col>
            </b-row>
            <b-row>
              <b-col md="3">
                <label>Type:</label>
              </b-col>
              <b-col md="9">
                <b-img src="http:images/game/hex-type1.png" fluid alt="Type 1" v-show="type!==1" @click="selectType(1);"></b-img>
                <b-img src="http:images/game/selected-hex-type1.png" fluid alt="Type 1" v-show="type===1"></b-img>
                <b-img src="http:images/game/hex-type2.png" fluid alt="Type 2" v-show="type!==2" @click="selectType(2);"></b-img>
                <b-img src="http:images/game/selected-hex-type2.png" fluid alt="Type 2" v-show="type===2"></b-img>
                <b-img src="http:images/game/hex-type3.png" fluid alt="Type 3" v-show="type!==3" @click="selectType(3);"></b-img>
                <b-img src="http:images/game/selected-hex-type3.png" fluid alt="Type 3" v-show="type===3"></b-img>
                <b-img src="http:images/game/hex-type4.png" fluid alt="Type 4" v-show="type!==4" @click="selectType(4);"></b-img>
                <b-img src="http:images/game/selected-hex-type4.png" fluid alt="Type 4" v-show="type===4"></b-img>
              </b-col>
            </b-row>
            <b-row>
              <b-col md="2">
                <label>Color:</label>
              </b-col>
              <b-col md="10">
                <swatches v-model="color" inline></swatches>
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

var generateHexTargetsWidget;
function generateHexTargets(data, onValidate, onCancel) {
    generateHexTargetsWidget.colCount = data.colCount;
    generateHexTargetsWidget.rowCount = data.rowCount;
    generateHexTargetsWidget.type = data.type;
    generateHexTargetsWidget.visible = true;
    generateHexTargetsWidget.onValidate = onValidate;
    generateHexTargetsWidget.onCancel = onCancel;
}

Vue.component('generate-square-targets', {
    components: { Swatches:window.VueSwatches.default },
    data: function() {
        return {
            colCount:0,
            rowCount:0,
            color:null,
            visible:false,
            onValidate:null,
            onCancel:null
        }
    },
    created: function() {
        generateSquareTargetsWidget = this;
    },
    methods: {
        validate() {
            this.onValidate({
                colCount: parseInt(this.colCount),
                rowCount: parseInt(this.rowCount)
            });
            this.visible = false;
        },
        cancel() {
            this.onCancel();
            this.visible = false;
        }
    },
    template:
        `<div v-show="visible" style="position:absolute; left:200px; top:100px; width:620px;">
        <b-card>
          <label><h3>Generate Square Targets</h3></label>
          <b-container fluid>
            <b-row>
              <b-col md="3">
                <label>Col Count:</label>
              </b-col>
              <b-col md="3">
                <b-form-input type="number" v-model="colCount"></b-form-input>
              </b-col>
              <b-col md="3">
                <label>Row Count:</label>
              </b-col>
              <b-col md="3">
                <b-form-input type="number" v-model="rowCount"></b-form-input>
              </b-col>
            </b-row>
            <b-row>
              <b-col md="2">
                <label>Color:</label>
              </b-col>
              <b-col md="10">
                <swatches v-model="color" inline></swatches>
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

var generateSquareTargetsWidget;
function generateSquareTargets(data, onValidate, onCancel) {
    generateSquareTargetsWidget.colCount = data.colCount;
    generateSquareTargetsWidget.rowCount = data.rowCount;
    generateSquareTargetsWidget.visible = true;
    generateSquareTargetsWidget.onValidate = onValidate;
    generateSquareTargetsWidget.onCancel = onCancel;
}

Vue.component('edit-target', {
    components: { Swatches:window.VueSwatches.default },
    data: function() {
        return {
            x:0,
            y:0,
            color:null,
            visible:false,
            onValidate:null,
            onCancel:null
        }
    },
    created: function() {
        editTargetWidget = this;
    },
    methods: {
        validate() {
            this.onValidate({
                colCount: parseInt(this.x),
                rowCount: parseInt(this.y)
            });
            this.visible = false;
        },
        cancel() {
            this.onCancel();
            this.visible = false;
        }
    },
    template:
        `<div v-show="visible" style="position:absolute; left:200px; top:100px; width:620px;">
        <b-card>
          <label><h3>Edit Target</h3></label>
          <b-container fluid>
            <b-row>
              <b-col md="3">
                <label>X:</label>
              </b-col>
              <b-col md="3">
                <b-form-input type="number" v-model="x"></b-form-input>
              </b-col>
              <b-col md="3">
                <label>Y:</label>
              </b-col>
              <b-col md="3">
                <b-form-input type="number" v-model="y"></b-form-input>
              </b-col>
            </b-row>
            <b-row>
              <b-col md="2">
                <label>Color:</label>
              </b-col>
              <b-col md="10">
                <swatches v-model="color" inline></swatches>
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

var editTargetWidget;
function editTarget(data, onValidate, onCancel) {
    console.log(data)
    editTargetWidget.x = data.x;
    editTargetWidget.y = data.y;
    editTargetWidget.visible = true;
    editTargetWidget.onValidate = onValidate;
    editTargetWidget.onCancel = onCancel;
}

new Vue({
    el: '#edit',
    template:
    `<div style="position:relative;">
    	<edit-target></edit-target>
    	<generate-hex-targets></generate-hex-targets>
    	<generate-square-targets></generate-square-targets>
    </div>`
});
