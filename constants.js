require('dotenv').config();


const auth = {
    clientId : process.env.CLIENT_ID,
    clientSecret : process.env.CLIENT_SECRET,
    refreshToken : process.env.REFRESH_TOKEN,
    redirectUri : process.env.REDIRECT_URI
}

module.exports = {
    auth
}
