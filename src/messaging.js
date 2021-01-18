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

        ws.send(JSON.stringify({
            type: "WELCOME",
            time: timestamp,
            receiver: user.visible,
        }));

        broadcast(null, JSON.stringify({
            type: "UPDATE_STATE",
            time: timestamp,
            state: { users: Object.values(users).map(user => user.visible) },
        }));

        broadcast(null, JSON.stringify({
            type: "ADMIN_MESSAGE",
            time: timestamp,
            text: `${username} has joined the chat!`,
        }))

        ws.on('message', async function (payload) {
            const timestamp = moment().unix();

            try {
                const text = JSON.parse(payload).text;
                const containsProfanity = await utils.containsProfanity(text);

                if (containsProfanity) {
                    await store.addMessageRecord({
                        sender: user.visible,
                        time: timestamp,
                        visible: false,
                        text: text
                    });

                    ws.send(JSON.stringify({
                        type: "ERROR",
                        time: timestamp,
                        text: `The following message contained profanity and was not sent:\n${text}`,
                    }));
                    return;
                }

                await store.addMessageRecord({
                    sender: user.visible,
                    time: timestamp,
                    visible: true,
                    text: text
                });

                broadcast(user, JSON.stringify({
                    type: "USER_MESSAGE",
                    time: timestamp,
                    sender: user.visible,
                    text: text,
                }))
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

        broadcast(null, JSON.stringify({
            type: "UPDATE_STATE",
            time: timestamp,
            state: { users: Object.values(users).map(user => user.visible) },
        }))

        broadcast(null, JSON.stringify({
            type: "ADMIN_MESSAGE",
            time: timestamp,
            text: `${user.username} has left the chat.`,
        }))
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