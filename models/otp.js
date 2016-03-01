var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = mongoose.model("OTP",new Schema({
	name:String,
	otp:String,
	time:Date
}));