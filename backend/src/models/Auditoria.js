import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Auditoria extends Model {}

Auditoria.init({
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  usuario_nome: { type: DataTypes.STRING, allowNull: true },
  perfil: { type: DataTypes.STRING, allowNull: true },
  operacao: { type: DataTypes.STRING, allowNull: false },
  recurso: { type: DataTypes.STRING, allowNull: false },
  recurso_id: { type: DataTypes.INTEGER, allowNull: true },
  detalhes: { type: DataTypes.JSON, allowNull: true },
  criado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize, modelName: 'auditoria', tableName: 'auditoria', createdAt: false, updatedAt: false,
  indexes: [{ fields: ['criado_em'] }, { fields: ['operacao'] }, { fields: ['recurso'] }],
});

export default Auditoria;
