FROM node:12-alpine

# set working directory (in the container) for all following instructions 
# to (in this case) /opt/app.
WORKDIR /opt/app

# copy package.json and yarn.lock files in server folder to the container.
COPY package*.json ./
COPY yarn.lock .

# install (only the) dependencies with yarn install. doing this here saves time 
# on rebuilds since the intermediate containers do not need to be modified.
RUN yarn install

# copy client and server code over to the container.
COPY . .

# expose port 8080 on the container for development.
EXPOSE 8080

# default command to run when the container starts - in this case starting the server.
CMD node app.js