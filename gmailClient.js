const { google } = require('googleapis');
const {auth} = require('./constants');


let cachedLabelId;
const LabelName = "Replied";

// Initialize OAuth2 client with credentials
const Auth2Client = new google.auth.OAuth2(auth.clientId, auth.clientSecret, auth.redirectUri);

Auth2Client.setCredentials({ refresh_token: auth.refreshToken});

const mailOptions = (from, to, subject, text, inReplyTo, references) => {
    const message = [
        `From: ${from}`,
        `To: ${to}`,
        `In-Reply-To: ${inReplyTo}`,
        `References: ${references}`,
        `Subject: ${subject}`,
        '',
        `${text}`
    ].join('\n');
    const rawMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return rawMessage;
}


async function createLabel(name) {
    try {
        const gmail = google.gmail({version: 'v1', auth: Auth2Client});
        const result = await gmail.users.labels.create({
            userId: 'me',
            requestBody: {
                name: name,
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show',
            },
        });
        return result.data;
    }
    catch (error) {
        const message = error.message;
        throw message;
    }
};

async function getLabels() {
    try {
        const gmail = google.gmail({version: 'v1', auth: Auth2Client});
        const result = await gmail.users.labels.list({
            userId: 'me',
        });
        const labels = result.data.labels;
        return labels;
    }
    catch (error) {
        const message = error.message;
        throw message;
    }
};

async function getLabelId() {
    if (cachedLabelId) {
        return cachedLabelId;
    }
    try {
        const labels = await getLabels();
        const label = labels.find((label) => label.name === LabelName);
        if (label){
            cachedLabelId = label.id;
            return cachedLabelId;
        }
        cachedLabelId = await createLabel(labelName);
        return cachedLabelId;
    }
    catch (error) {
        const message = error.message;
        throw message;
    }
};

async function getUser() {
    try {
        const gmail = google.gmail({version: 'v1', auth: Auth2Client});
        const result = await gmail.users.getProfile({
            userId: 'me',
        });
        return result.data;
    }
    catch (error) {
        const message = error.message;
        throw message;
    }
};

async function sendMail(threadId, rawMessage) {
    try {
        const gmail = google.gmail({version: 'v1', auth: Auth2Client});
        const result = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: rawMessage,
                threadId: threadId,
            }
        });
        return result;
    } catch (error) {
        console.error('Failed to send mail:', error);
        throw error;
    }
}

async function getMessage(messageId) {
    try {
        const gmail = google.gmail({version: 'v1', auth: Auth2Client});
        const result = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
        });
        return result.data;
    }
    catch (error) {
        const message = error.message;
        throw message;
    }
};

async function getMails() {
    try {
        const gmail = google.gmail({version: 'v1', auth: Auth2Client});
        currTime = Date.now();
        today = new Date(currTime).toLocaleDateString();
        const query = `is:unread after:${today}`;
        const result = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            labelIds: ['INBOX','CATEGORY_PERSONAL'],
            maxResults: 10,

        });
        messages = result.data.messages;
        const promises = messages.map(async (message) => {
            const messageId = message.id;
            const messageData = await getMessage(messageId);
            return messageData;
        });
        const messagesData = await Promise.all(promises);
        
        const mailsPromise = messagesData.map((messageData) => {
            const mail = {};
            const headers = messageData.payload.headers;
            
            inReplyTo = headers.find((header) => header.name === 'In-Reply-To');
            if (inReplyTo){
                return null;
            }
            mail.threadId = messageData.threadId;
            mail.from = headers.find((header) => header.name === 'From').value
            mail.to = headers.find((header) => header.name === 'To').value;
            mail.subject = headers.find((header) => header.name === 'Subject').value;
            mail.messageId = headers.find((header) => header.name === 'Message-ID').value;
            mail.date = headers.find((header) => header.name === 'Date').value;
            return mail;
        });
        const mails = await Promise.all(mailsPromise);
        return mails.filter((mail) => mail !== null);
    }
    catch (error) {
        const message = error.message;
        throw message;
    }
};

async function modiftyThread(threadId, addLabels, removeLabels) {
    try {
        const gmail = google.gmail({version: 'v1', auth: Auth2Client});
        const result = await gmail.users.threads.modify({
            userId: 'me',
            id: threadId,
            requestBody: {
                addLabelIds: addLabels,
                removeLabelIds: removeLabels,
            },
        });
        return result.data;
    }
    catch (error) {
        const message = error.message;
        throw message;
    }
};


async function sendReply(mail){
    const from = mail.to;
    const to = mail.from;
    const subject = `Re: ${mail.subject}`
    const messageText = `Hi ,\n\nThanks for your email! I will get back to you as soon as possible.\n\nBest Regards,`;
    const inReplyTo = mail.messageId;
    const references = mail.messageId;
    
    const rawMessage = mailOptions(from, to, subject, messageText, inReplyTo, references)
    
    const result = await sendMail(mail.threadId, rawMessage);

    if (result.status === 200) {
        console.log("Mail sent successfully to " + to );
        return mail.threadId;
    }
    console.log("Error sending mail to " + to + " : " );
    console.log(result)
    return null;
}

module.exports = {
    getMails,
    getUser,
    getLabelId,
    modiftyThread,
    sendReply,
    Auth2Client,

}
