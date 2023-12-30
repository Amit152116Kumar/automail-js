const express = require('express');
const app = express();
const port = 8000;
const gmailClient = require('./gmailClient');
const cron = require('node-cron');

// Cron job runs every 2 minutes
cron.schedule('*/2 * * * *', async() => {
    try{
        const mails = await gmailClient.getMails();

        const replyPromises = mails.map(gmailClient.sendReply);
        const response = await Promise.all(replyPromises);

        // Filter out null threadIds and mark emails as UNREAD
        const mailThreadIds = response.filter((threadId) => threadId !== null);

        const labelId = await gmailClient.getLabelId();

        // Modify threads with label and UNREAD status
        const promises = mailThreadIds.map((threadId) => gmailClient.modiftyThread(threadId, labelId, ["UNREAD"]));

        await Promise.all(promises);

    }
    catch (error) {
    console.log(error);
  }
});

app.get('/profile', async(req, res) => {
    try{
        const profile = await gmailClient.getUser();
        res.send(profile);
        
    }
    catch (error) {
        console.log(error);
        res.send(error);
    }
});

app.get('/', async(req, res) => {
    res.sendFile(__dirname + '/home.html');
});

app.get('/login', (req, res) => {
    const authUrl = gmailClient.Auth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    });
    res.redirect(authUrl)
});

// Callback endpoint to handle the response after Gmail login
app.get('/callback', (req, res) => {
    const code = req.query.code;
    console.log(req.query)
    gmailClient.Auth2Client.getToken(code, async (err, token) => {
        if (err) {
            console.error('Error retrieving access token', err);
            res.redirect('/');
            return;
        }
        gmailClient.Auth2Client.setCredentials(token);
        res.redirect('/profile');
    });
});
app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});

