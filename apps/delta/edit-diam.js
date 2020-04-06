
Vue.component('show-infos', {
    data() {
        return {
            visible: false,
            onValidate: undefined
        };
    },
    created() {
        showInfosWidget = this;
    },
    methods: {
        validate() {
            this.onValidate({});
            this.visible = false;
        }
    },
    template:
        `<div class="plano_modal" v-show="visible" style="position:absolute; left:200px; top:50px; width:250px;">
            <b-card>
              <label> <h3>Infos</h3> </label>
              <b-container fluid>
                <b-row>
                  <b-col sm="12"> <label>Delta version : 0.1</label> </b-col>
                </b-row>
              </b-container>
              <b-button-toolbar>
                <b-button style="margin:5px;" variant="primary" @click="validate();">Ok</b-button>
              </b-button-toolbar>
            </b-card>
          </div>`
});

var showInfosWidget;
window.showInfos = function showInfos(data, onValidate) {
    showInfosWidget.onValidate = onValidate;
    showInfosWidget.visible = true;
};

Vue.component('edit-position', {
    data() {
        return {
            x: 0,
            y: 0,
            visible: false,
            onValidate: undefined,
            onCancel: undefined
        };
    },
    created() {
        editPositionWidget = this;
    },
    methods: {
        validate() {
            this.onValidate({
                x: this.x,
                y: this.y
            });
            this.visible = false;
        },
        cancel() {
            this.onCancel();
            this.visible = false;
        }
    },
    template:
        `<div class="plano_modal" v-show="visible" style="position:absolute; left:200px; top:50px; width:550px;">
            <b-card>
              <label> <h3>Edit Position</h3> </label>
              <b-container fluid>
                <b-row>
                  <b-col sm="4"> <label>X:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input type="number" v-model="x"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Y:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input type="number" v-model="y"></b-form-input>
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

var editPositionWidget;
window.editPosition = function editPosition(data, onValidate, onCancel) {
    editPositionWidget.x = data.x;
    editPositionWidget.y = data.y;
    editPositionWidget.visible = true;
    editPositionWidget.onValidate = onValidate;
    editPositionWidget.onCancel = onCancel;
};

Vue.component('rename', {
    data() {
        return {
            label: "",
            visible: false,
            onValidate: undefined,
            onCancel: undefined
        };
    },
    created() {
        renameWidget = this;
    },
    methods: {
        validate() {
            this.onValidate({
                label: this.label
            });
            this.visible = false;
        },
        cancel() {
            this.onCancel();
            this.visible = false;
        }
    },
    template:
        `<div class="plano_modal" v-show="visible" style="position:absolute; left:200px; top:50px; width:550px;">
            <b-card>
              <label> <h3>Rename</h3> </label>
              <b-container fluid>
                <b-row>
                  <b-col sm="4"> <label>Name:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input v-model="label"></b-form-input>
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

var renameWidget;
window.rename = function rename(data, onValidate, onCancel) {
    renameWidget.label = data.label;
    renameWidget.visible = true;
    renameWidget.onValidate = onValidate;
    renameWidget.onCancel = onCancel;
};

Vue.component('comment', {
    data() {
        return {
            comment: "",
            visible: false,
            onValidate: undefined,
            onCancel: undefined
        };
    },
    created() {
        commentWidget = this;
    },
    methods: {
        validate() {
            this.onValidate({
                comment: this.comment
            });
            this.visible = false;
        },
        cancel() {
            this.onCancel();
            this.visible = false;
        }
    },
    template:
        `<div class="plano_modal" v-show="visible" style="position:absolute; left:200px; top:50px; width:550px;">
            <b-card>
              <label> <h3>Edit comment</h3> </label>
              <b-container fluid>
                <b-row>
                  <b-col sm="4"> <label>Comment:</label> </b-col>
                  <b-col sm="4">
                    <b-form-textarea
                      id="textarea"
                      v-model="comment"
                      placeholder="Add a comment..."
                      rows="3"
                      max-rows="6"
                    ></b-form-textarea>
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

var commentWidget;
window.comment = function comment(data, onValidate, onCancel) {
    commentWidget.comment = data.comment;
    commentWidget.visible = true;
    commentWidget.onValidate = onValidate;
    commentWidget.onCancel = onCancel;
};

Vue.component('generate-ladders', {
    data() {
        return {
            ladderWidth: 10,
            ladderHeight: 120,
            left: 0,
            right: 0,
            y: 0,
            intermediateLaddersCount: 0,
            topSlot: -50,
            bottomSlot: 50,
            slotInterval: 5,
            visible: false,
            onValidate: undefined,
            onCancel: undefined
        };
    },
    created() {
        generateLaddersWidget = this;
    },
    methods: {
        validate() {
            this.onValidate({
                ladderWidth: parseInt(this.ladderWidth),
                ladderHeight: parseInt(this.ladderHeight),
                left: parseInt(this.left),
                right: parseInt(this.right),
                y: parseInt(this.y),
                intermediateLaddersCount: parseInt(this.intermediateLaddersCount),
                topSlot: parseInt(this.topSlot),
                bottomSlot: parseInt(this.bottomSlot),
                slotInterval: parseInt(this.slotInterval)
            });
            this.visible = false;
        },
        cancel() {
            this.onCancel();
            this.visible = false;
        }
    },
    template:
        `<div class="plano_modal" v-show="visible" style="position:absolute; left:200px; top:50px; width:550px;">
            <b-card>
              <label> <h3>Generate Ladders</h3> </label>
              <b-container fluid>
                <b-row>
                  <b-col sm="4"> <label>Ladder Width:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input type="number" v-model="ladderWidth"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Ladder Height:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input type="number" v-model="ladderHeight"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Leftest Ladder:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input type="number" v-model="left"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Rightest Ladder:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input type="number" v-model="right"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Y:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input type="number" v-model="y"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Int. ladders count:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input
                      type="number"
                      v-model="intermediateLaddersCount"
                    ></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Top Slot:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input type="number" v-model="topSlot"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Bottom Slot:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input type="number" v-model="bottomSlot"></b-form-input>
                  </b-col>
                </b-row>
                <b-row>
                  <b-col sm="4"> <label>Slot Interval:</label> </b-col>
                  <b-col sm="4">
                    <b-form-input type="number" v-model="slotInterval"></b-form-input>
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

var generateLaddersWidget;
window.generateLadders = function generateLadders(data, onValidate, onCancel) {
    generateLaddersWidget.left = -data.width / 2 + 5;
    generateLaddersWidget.right = data.width / 2 - 5;
    generateLaddersWidget.ladderHeight = data.height - 20;
    generateLaddersWidget.topSlot = -data.height / 2 + 20;
    generateLaddersWidget.bottomSlot = data.height / 2 - 20;
    generateLaddersWidget.intermediateLaddersCount = Math.max( Math.floor((data.width - 10) / 100) - 1, 0 );
    generateLaddersWidget.visible = true;
    generateLaddersWidget.onValidate = onValidate;
    generateLaddersWidget.onCancel = onCancel;
};

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
    <div style="position:relative;z-index:1;">
    	<rename></rename>
    	<comment></comment>
    	<edit-position></edit-position>
    	<show-infos></show-infos>
    	<generate-ladders></generate-ladders>
    	<generate-fixings></generate-fixings>
    	<generate-hooks></generate-hooks>
    </div>
`
});