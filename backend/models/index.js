const DocumentMetadata = require('./DocumentMetadata');
const User = require('./User');
const DocumentShare = require('./DocumentShare');

module.exports = {
    DocumentMetadata,
    User,
    DocumentShare,
    PublicShare: require('./PublicShare')
};
