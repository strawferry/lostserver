



exports.strsub = function(str, length = 10) {
    if(str.length < length){
        return str;
    }else{
        return str.substr(0, length) + '...';
    }

};