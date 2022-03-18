import Fastify from "fastify";
import { routes } from "./routes/index";
import { config } from "dotenv";

config();

const fastify = Fastify({
	logger: true,
});
fastify.register(routes);

fastify.listen(3000, function (err, address) {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
	// Server is now listening on ${address}
});
