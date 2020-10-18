const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const liveSchema = new Schema({

    
    streamer_id : {
      type: String,
      required : true
    },
    viewers_count:Number,
    start : String,
    end:String,
    path :Array,
    

}, {
  timestamps: true,
});
/*{_id,title,description,book_link,book_image,writers}*/
const Live = mongoose.model('live', liveSchema);

module.exports = Live

