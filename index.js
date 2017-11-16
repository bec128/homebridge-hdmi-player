var cecControl = require("hdmi-cec");
var omx = require("node-omxplayer");
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-hdmi-player","HDMIPlayer", hdmiPlayer);
}

function hdmiPlayer(log, config) {
    this.log = log;
    this.name = config["name"];
    this.streamUrl = config["streamUrl"];
    this.log("Initializing " + this.name + " and streaming from " + this.streamUrl);
    this.initService();
}

hdmiPlayer.prototype = {
    initService: function() {
        this.playerService = new Service.Switch(this.name);
        this.infoService = new Service.AccessoryInformation();
        this.infoService.setCharacteristic(Characteristic.Manufacturer, "Blake Cormier");
        this.infoService.setCharacteristic(Characteristic.Model, "Raspi HDMI Streamer");
        this.infoService.setCharacteristic(Characteristic.SerialNumber, "999999");
        
        this.cec = new cecControl.Commander();
        this.player = new omx();

        this.playerOn = this.playerService.getCharacteristic(Characteristic.On);
        this.playerOn.on('set', this.handleStateChange.bind(this));
        this.playerOn.on('get', this.getState.bind(this));
    },
    setTvPowerState: function(state) {
        //valid options: cecControl.PowerStatus.ON, STANDBY
        let tvPowerState = cec.setPowerState(state);
        this.log("TV Power State: " + tvPowerState);
        return tvPowerState;
    },
    getTvPowerState: function() {
        return cec.getPowerState();
    },
    handleStateChange: function(state,callback){
        this.log("handleStateChange called")
        let tvPower = this.getTvPowerState();
        let streamPlaying = this.getOmxStreamStatus();

        if (state) { //turn ON
            if (!tvPower) {
                this.setTvPowerState(cecControl.PowerStatus.ON);
            }
            if (!streamPlaying) {
                this.startOmxStream(this.streamUrl);
            }
        } else { //turn OFF
            if (tvPower) {
                this.setTvPowerState(cecControl.PowerStatus.STANDBY);
            }
            if (streamPlaying) {
                this.stopOmxStream();
            }
        }

        callback();
    },
    getState: function(callback){
        this.log("GetState called")
        let tvPower = this.getTvPowerState();
        let streamPlaying = this.getOmxStreamStatus();
        let state = false;
        if (tvPower && streamPlaying) {
            state = true;
        }
        callback(null,state);
    },
    startOmxStream: function(url) {
        this.log("Starting OMX stream")
        this.player.newSource(url, "hdmi");
    },
    stopOmxStream: function() {
        this.log("Stopping OMX stream")
        this.player.quit();
    },
    getOmxStreamStatus: function() {
        this.log("GetOmxStreamStatus called")
        return this.player.running;
    },
    getServices: function() {
        return [this.infoService, this.playerService];
    }

};