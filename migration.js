const child_process = require("child_process");
const nconf = require("nconf");
const Umzug = require("umzug");
const Sequelize = require("sequelize");
const fs = require("fs");
const path = require("path");

console.log("Loading configuration config.json");
nconf
    .argv()
    .env()
    .file({ file: `${__dirname}/src/config.json` });

const SCRIBBLE_SCHEMA = "scribble";


// normalize db configuration
const normalizedConfig = {
    dialect: nconf.get("DB_DIALECT"),
    database: nconf.get("DB_NAME"),
    logging: console.log,
    define: {
        schema: SCRIBBLE_SCHEMA,
    },
    dialectOptions: {
        searchPath: [SCRIBBLE_SCHEMA, STATIC_SCHEMA, PURCHASES_SCHEMA],
    },
};
// connect to the db
const sequelize = new Sequelize("", "", "", normalizedConfig);
sequelize.beforeConnect(async (config) => {
    await loadConfigurations();
    const postgreSQLConfig = nconf.get("postgreSQLConfig");
    console.log(`postgreSQLConfig: ${JSON.stringify(postgreSQLConfig)}`);
    config.username = postgreSQLConfig.username;
    config.password = postgreSQLConfig.password;
    config.database = normalizedConfig.database;
    config.host = postgreSQLConfig.host;
    config.port = postgreSQLConfig.port;
    config.dialect = postgreSQLConfig.engine;
    config.logging = normalizedConfig.logging;
});
// create umzug instance
console.log("Loading migrations...");
const loadMigration = async () => {
    try {
        console.log(`${SCRIBBLE_SCHEMA} schema creation if not exist.`);
        await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${SCRIBBLE_SCHEMA}";`);

        const umzug = new Umzug({
            storage: "sequelize",
            storageOptions: {
                sequelize,
                tableName: "migrations",
                schema: SCRIBBLE_SCHEMA,
            },

            migrations: {
                params: [
                    sequelize.getQueryInterface(), // queryInterface
                    sequelize.constructor, // DataTypes
                    () => {
                        throw new Error(
                            'Migration tried to use old style "done" callback. Please upgrade to "umzug" and return a promise instead.'
                        );
                    },
                ],
                path: "./migrations",
                pattern: /\.js$/,
            },
            logging: console.log,
        });
        function logUmzugEvent(eventName) {
            return function (name, migration) {
                console.log(`${name} ${eventName}`);
            };
        }
        umzug.on("migrating", logUmzugEvent("migrating"));
        umzug.on("migrated", logUmzugEvent("migrated"));
        umzug.on("reverting", logUmzugEvent("reverting"));
        umzug.on("reverted", logUmzugEvent("reverted"));

        function cmdStatus() {
            const result = {};

            return umzug
                .executed()
                .then((executed) => {
                    result.executed = executed;
                    return umzug.pending();
                })
                .then((pending) => {
                    result.pending = pending;
                    return result;
                })
                .then(({ executed, pending }) => {
                    executed = executed.map((m) => {
                        m.name = path.basename(m.file, ".js");
                        return m;
                    });
                    pending = pending.map((m) => {
                        m.name = path.basename(m.file, ".js");
                        return m;
                    });

                    const current = executed.length > 0 ? executed[0].file : "<NO_MIGRATIONS>";
                    const status = {
                        current,
                        executed: executed.map((m) => m.file),
                        pending: pending.map((m) => m.file),
                    };

                    console.log(JSON.stringify(status, null, 2));

                    return { executed, pending };
                });
        }

        function cmdMigrate() {
            return umzug.up();
        }

        function cmdMigrateNext() {
            return cmdStatus().then(({ executed, pending }) => {
                if (pending.length === 0) {
                    return Promise.reject(new Error("No pending migrations"));
                }
                const next = pending[0].name;
                return umzug.up({ to: next });
            });
        }

        function cmdReset() {
            return umzug.down({ to: 0 });
        }

        function cmdResetPrev() {
            return cmdStatus().then(({ executed, pending }) => {
                if (executed.length === 0) {
                    return Promise.reject(new Error("Already at initial state"));
                }
                const prev = executed[executed.length - 1].name;
                return umzug.down({ to: prev });
            });
        }

        function cmdHardReset() {
            return new Promise((resolve, reject) => {
                setImmediate(() => {
                    try {
                        console.log(`dropdb ${nconf.get("DB_NAME")}`);
                        child_process.spawnSync(`dropdb ${nconf.get("DB_NAME")}`);
                        console.log(
                            `createdb ${nconf.get("DB_NAME")} --username ${
                                nconf.get("postgreSQLConfig").username
                            }`
                        );
                        child_process.spawnSync(
                            `createdb ${nconf.get("DB_NAME")} --username ${
                                nconf.get("postgreSQLConfig").username
                            }`
                        );
                        resolve();
                    } catch (e) {
                        console.error(e);
                        reject(e);
                    }
                });
            });
        }

        const cmd = process.argv[2].trim();
        let executedCmd;

        console.log(`${cmd.toUpperCase()} BEGIN`);
        switch (cmd) {
            case "status":
                executedCmd = cmdStatus();
                break;

            case "up":
            case "migrate":
                executedCmd = cmdMigrate();
                break;

            case "next":
            case "migrate-next":
                executedCmd = cmdMigrateNext();
                break;

            case "reset":
                executedCmd = cmdReset();
                break;

            case "down":
            case "prev":
            case "reset-prev":
                executedCmd = cmdResetPrev();
                break;

            case "reset-hard":
                executedCmd = cmdHardReset();
                break;

            default:
                console.log(`invalid cmd: ${cmd}`);
                process.exit(1);
        }

        executedCmd
            .then((result) => {
                const doneStr = `${cmd.toUpperCase()} DONE`;
                console.log(doneStr);
                console.log("=".repeat(doneStr.length));
            })
            .catch((err) => {
                const errorStr = `${cmd.toUpperCase()} ERROR`;
                console.log(errorStr);
                console.log("=".repeat(errorStr.length));
                console.log(err);
                console.log("=".repeat(errorStr.length));
            })
            .then(() => {
                if (cmd !== "status" && cmd !== "reset-hard") {
                    return cmdStatus();
                }
                return Promise.resolve();
            })
            .then(() => process.exit(0));
    } catch (error) {
        console.error(`Error on migration config`, error);
        process.exit(1);
    }
};

loadMigration();
