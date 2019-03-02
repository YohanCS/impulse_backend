module.exports = {
    express: {
        GLOBAL_ENDPOINT: '/v1',
        RESPONSE_TIMEOUT_MILLI: 30000
    },
    mysql_config: {
        ADMIN_TABLE: ''
    },
    bcrypt: {
        SALT_ROUNDS: 10
    },
    sensors: {
        sensorDeltaFeet: 2
    },
    db: {
        DATABASE_USER: 'api',
        DATABASE_PASSWORD: 'some pass',
        DATABASE_NAME: 'some db name',
        DATABASE_IP: '138.197.217.131',
        DATABASE_PORT: '3306'
    }
};