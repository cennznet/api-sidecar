import mysql from "mysql2/promise";
import { config } from "dotenv";

config();
export const DATABASE = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE,
	port: parseInt(process.env.DB_PORT),
});
