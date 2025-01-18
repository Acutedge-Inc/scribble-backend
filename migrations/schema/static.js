const { addTimeStampToSchema } = require("../../src/lib/utils");
const {
  STATUS: { ACTIVE },
} = require("../../src/repositories/constants/agreements");
const STATIC_ENUM_TYPE = require("../enumType/static");

const staticTables = {
  categories: (queryInterface, Sequelize) => {
    const schema = {
      category_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: Sequelize.STRING(50),
      image_name: Sequelize.STRING(50),
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      tag: {
        type: Sequelize.INTEGER,
        unique: true,
      },
    };

    return addTimeStampToSchema(schema, Sequelize);
  },
  countries: (queryInterface, Sequelize) => {
    const schema = {
      country_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: Sequelize.STRING(50),
      alpha2_code: Sequelize.STRING(50),
      alpha3_code: Sequelize.STRING(50),
      alt_spellings: Sequelize.JSONB,
      calling_codes: Sequelize.JSONB,
      region: Sequelize.STRING(50),
      sub_region: Sequelize.STRING(50),
      latlong: Sequelize.JSONB,
      timezone: Sequelize.JSONB,
      borders: Sequelize.JSONB,
      native_name: Sequelize.STRING(100),
      numeric_code: Sequelize.INTEGER,
      currencies: Sequelize.JSONB,
      flag: Sequelize.STRING(100),
      languages: Sequelize.JSONB,
      translations: Sequelize.JSONB,
      is_operating: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
    };
    return addTimeStampToSchema(schema, Sequelize);
  },
  age_rating: (queryInterface, Sequelize) => {
    const schema = {
      age_rating_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      title: Sequelize.STRING(50),
      description: Sequelize.STRING(50),
    };

    return addTimeStampToSchema(schema, Sequelize);
  },
  agreement_content: (queryInterface, Sequelize) => {
    const schema = {
      agreement_content_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      title: Sequelize.STRING,
      content: Sequelize.TEXT("medium"),
      version: Sequelize.FLOAT,
      agreement_type: {
        type: STATIC_ENUM_TYPE.AGREEMENT_TYPE.schemaType,
      },
      status: {
        type: STATIC_ENUM_TYPE.AGREEMENT_STATUS.schemaType,
        defaultValue: ACTIVE,
      },
    };

    return addTimeStampToSchema(schema, Sequelize);
  },
  feedback_suggestion: (queryInterface, Sequelize) => {
    const schema = {
      suggestion_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      title: Sequelize.TEXT,
      suggestion_type: Sequelize.TEXT,
    };

    return addTimeStampToSchema(schema, Sequelize);
  },
  steps: (queryInterface, Sequelize) => {
    const schema = {
      step_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: Sequelize.STRING(50),
    };

    return addTimeStampToSchema(schema, Sequelize);
  },
  sub_steps: (queryInterface, Sequelize) => {
    const schema = {
      sub_step_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      step_id: {
        type: Sequelize.UUID,
        references: {
          model: "steps",
          key: "step_id",
        },
      },
      name: Sequelize.STRING(50),
      is_automatic_validation_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    };

    return addTimeStampToSchema(schema, Sequelize);
  },
  permission_list: (queryInterface, Sequelize) => {
    const schema = {
      permission_list_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
      },
      name: Sequelize.STRING(150),
      description: Sequelize.TEXT,
      permission_type: {
        type: STATIC_ENUM_TYPE.PERMISSION_TYPE.schemaType,
      },
      protection_level: {
        type: STATIC_ENUM_TYPE.PROTECTION_LEVEL.schemaType,
      },
    };

    return addTimeStampToSchema(schema, Sequelize);
  },
};

module.exports = staticTables;
