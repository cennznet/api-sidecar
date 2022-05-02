const mongoose = require('mongoose');
const { Schema } = mongoose;
//const autoIncrement = require('mongoose-auto-increment');

const EVENT_TRACKER = 'EventTracker';

const EventTrackerSchema = new Schema({
    //_id: String
    streamId: String, // stream id
    streamType: Number,
    eventType: String,
    version: String, // blocknumber
    data: Object,
    signer: String,
},{ collection: EVENT_TRACKER })
EventTrackerSchema.index( { streamId: 1, version: 1, eventType: 1 }, { unique: true } );

module.exports = {
    EventTracker: mongoose.model('EventTracker', EventTrackerSchema),
    EVENT_TRACKER
}
