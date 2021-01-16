const niceware = require('niceware');
const moment = require('moment');
const utils = require('./utils');
const store = require('./store');
const classes = require('./classes');

const bind = function (wss) {
    const users = {};

    wss.on('connection', async function (ws, req) {
        const username = niceware.generatePassphrase(4).join('-');
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const country = await utils.getCountryCode(ip);
        const timestamp = moment().unix()

        const user = new classes.User(ws, username, ip, country);
        store.startUserSession(user);
        users[username] = user;

        const welcomeMessage =
            new classes.AdminMessage("WELCOME", timestamp, user, null, null);
        ws.send(welcomeMessage.json);

        const newUserUpdateMessage =
            new classes.AdminMessage("UPDATE_STATE", timestamp, null,
                { users: Object.values(users).map(user => user.visible) }, null);
        broadcast(null, newUserUpdateMessage.json);

        const newUserAdminMessage =
            new classes.AdminMessage("ADMIN_MESSAGE", timestamp, null, null, `${username} has joined the chat!`);
        broadcast(null, newUserAdminMessage.json);

        ws.on('message', async function (payload) {
            const timestamp = moment().unix();
            const text = JSON.parse(payload).text;

            try {
                const containsProfanity = await utils.containsProfanity(text);

                if (containsProfanity) {
                    await store.addMessageRecord(new classes.UserMessage(user, false, timestamp, text));
                    const profanityErrorMessage = new classes.AdminMessage("ERROR", timestamp, null, null,
                        `The following message contained profanity and was not sent:\n${text}`);
                    ws.send(profanityErrorMessage.json);
                    return;
                }

                await store.addMessageRecord(new classes.UserMessage(user, true, timestamp, text));
                const userMessage = new classes.UserMessage(user, true, timestamp, text);
                broadcast(user, userMessage.json);
            }
            catch (e) {
                console.log(e.message);
                return;
            }

        });
    });

    wss.on('disconnection', async function (ws) {
        const timestamp = moment().unix();
        const user = Object.values(users).find((user) => user.ws == ws);
        if (!user) {
            return;
        }

        store.endUserSession(user);
        delete users[user.username];

        const disconnectionStateUpdateMessage =
            new classes.AdminMessage("UPDATE_STATE", timestamp, null,
                { users: Object.values(users).map(user => user.visible) }, null);
        broadcast(null, disconnectionStateUpdateMessage.json);

        const disconnectionAdminMessage =
            new classes.AdminMessage("ADMIN_MESSAGE", timestamp, null, null, `${user.username} has left the chat.`);
        broadcast(null, disconnectionAdminMessage.json);

    });


    /**
     * Broadcasts text to all users except the sender
     * @param {classes.User} sender classes.Users object. null if message sent from admin.
     * @param {String} text message text.
     */
    const broadcast = function (sender, message) {
        Object.values(users).forEach((user) => {
            if (!sender || sender.ws != user.ws) {
                user.ws.send(message);
            }
        });
    }
};

module.exports = {
    bind,
}