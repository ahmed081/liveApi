const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ApiSchema = new Schema({

    user:{
        username:{
            type:String,
            require:true,
        },
        password:{
            type:String,
            require:true
        }
    },
    token:{
        type:String
    }

}, {
  timestamps: true,
});
/*{_id,title,description,book_link,book_image,writers}*/
const Api = mongoose.model('Api', ApiSchema);

module.exports = Api

