import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Aluno extends Model {}

Aluno.init(
  {
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    data_nascimento: {
      type: DataTypes.DATEONLY
    },

    serie: {
      type: DataTypes.STRING
    },

    cpf: {
      type: DataTypes.STRING(14),
      unique: true
    },

    telefone: {
      type: DataTypes.STRING
    },

    endereco: {
      type: DataTypes.TEXT
    },

    turma_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'aluno'
  }
);

export default Aluno;