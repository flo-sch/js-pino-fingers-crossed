import test from "ava";
import pino from "pino";
import sinon from "sinon";
import fingersCrossed, { enable } from "./index.mjs";

function createLogger(bindings = {}) {
	const fakeStream = {
		write: () => {},
	};
	const write = sinon.spy(fakeStream, "write");
	const logger = pino(
		{ timestamp: false, base: bindings, level: "trace" },
		fingersCrossed(fakeStream),
	);

	return { logger, write };
}

test("Act normally if not enabled", async (t) => {
	const { logger, write } = createLogger();

	logger.info("first message");
	logger.info("second message");
	t.is(write.callCount, 2);
	t.is(write.getCall(0).firstArg, '{"level":30,"msg":"first message"}\n');
	t.is(write.getCall(1).firstArg, '{"level":30,"msg":"second message"}\n');
});

test("No log is outputted if level is not reach", async (t) => {
	const { logger, write } = createLogger({ [enable]: 50 });

	logger.info("first queued message");
	logger.info("second queued message");

	t.is(write.callCount, 0);
});

test("Log is outputted only after level is reach", async (t) => {
	const { logger, write } = createLogger({ [enable]: 50 });

	logger.info("1st queued message");
	logger.info("2nd queued message");

	t.is(write.callCount, 0);

	logger.error("3rd message");

	t.is(write.callCount, 3);
	t.is(write.getCall(0).firstArg, '{"level":30,"msg":"1st queued message"}\n');
	t.is(write.getCall(1).firstArg, '{"level":30,"msg":"2nd queued message"}\n');
	t.is(write.getCall(2).firstArg, '{"level":50,"msg":"3rd message"}\n');

	write.resetHistory();

	logger.info("4th queued message");

	t.is(write.callCount, 0);
});

test("Log is outputted even with higher level is reach", async (t) => {
	const { logger, write } = createLogger({ [enable]: 50 });

	logger.info("1st queued message");
	logger.info("2nd queued message");

	t.is(write.callCount, 0);

	logger.fatal("3rd message");

	t.is(write.callCount, 3);
	t.is(write.getCall(0).firstArg, '{"level":30,"msg":"1st queued message"}\n');
	t.is(write.getCall(1).firstArg, '{"level":30,"msg":"2nd queued message"}\n');
	t.is(write.getCall(2).firstArg, '{"level":60,"msg":"3rd message"}\n');

	write.resetHistory();

	logger.info("4th queued message");

	t.is(write.callCount, 0);
});

test("Feature can be disabled for one message", async (t) => {
	const { logger, write } = createLogger({ [enable]: 50 });

	logger.info("1st queued message");
	logger.info("2nd queued message");

	t.is(write.callCount, 0);

	logger.info({ [enable]: false }, "3rd message");

	t.is(write.callCount, 1);
	t.is(write.getCall(0).firstArg, '{"level":30,"msg":"3rd message"}\n');

	write.resetHistory();

	logger.info("4th queued message");

	t.is(write.callCount, 0);
});

test("Feature can be turn on and off", async (t) => {
	const { logger, write } = createLogger({ [enable]: 50 });

	logger.info("1st queued message");
	logger.info("2nd queued message");

	t.is(write.callCount, 0);

	logger.setBindings({ [enable]: false });

	logger.info("3rd message");
	logger.info("4th message");

	t.is(write.callCount, 2);
	t.is(write.getCall(0).firstArg, '{"level":30,"msg":"3rd message"}\n');
	t.is(write.getCall(1).firstArg, '{"level":30,"msg":"4th message"}\n');

	write.resetHistory();

	logger.setBindings({ [enable]: 50 });

	logger.info("5th queued message");
	t.is(write.callCount, 0);

	logger.error("6th message");
	t.is(write.callCount, 4);
	t.is(write.getCall(0).firstArg, '{"level":30,"msg":"1st queued message"}\n');
	t.is(write.getCall(1).firstArg, '{"level":30,"msg":"2nd queued message"}\n');
	t.is(write.getCall(2).firstArg, '{"level":30,"msg":"5th queued message"}\n');
	t.is(write.getCall(3).firstArg, '{"level":50,"msg":"6th message"}\n');
});

test("Child are independent from its parent", (t) => {
	const { logger, write } = createLogger({ [enable]: 50 });

	logger.info("first queued message");
	logger.info("second queued message");

	t.is(write.callCount, 0);

	const child = logger.child({ [enable]: 30 });
	child.debug("first child queued message");
	t.is(write.callCount, 0);

	child.info("second child message");
	t.is(write.callCount, 2);
	t.is(
		write.getCall(0).firstArg,
		'{"level":20,"msg":"first child queued message"}\n',
	);
	t.is(
		write.getCall(1).firstArg,
		'{"level":30,"msg":"second child message"}\n',
	);
});
