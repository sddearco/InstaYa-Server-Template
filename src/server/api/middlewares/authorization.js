import { sign, verify } from 'jsonwebtoken';

import { readFileSync } from 'fs';
import { join } from 'path';

import { env } from '@config/env';

/**
 * Don't worry if you don't understand these keywords, I'm not going to explain
 * them either.
 */
export const TOKEN_KEYS = {
	ACCESS: 'lemon_qid',
	REFRESH: 'tangerine_qid',
};

const refreshHeader = {
	kid: env.REFRESH_TOKEN_SECRET,
};

const accessHeader = {
	kid: env.ACCESS_TOKEN_SECRET,
};

const signRefreshToken = async (payload) => {
	const key = readFileSync(join(process.cwd(), '/keys/refresh.private.pem'));

	const token = await sign(payload, key, {
		algorithm: 'ES256',
		expiresIn: '7d',
		header: refreshHeader,
	});

	return token;
};

const signAccessToken = async (payload) => {
	const key = readFileSync(join(process.cwd(), '/keys/access.private.pem'));

	const token = await sign(payload, key, {
		algorithm: 'ES256',
		expiresIn: '5m',
		header: accessHeader,
	});

	return token;
};

export const signTokenPair = async (payload) => {
	const refreshToken = await signRefreshToken(payload);
	const accessToken = await signAccessToken(payload);

	return { refreshToken, accessToken };
};

/**
 *
 * @param {string} token Signed ES256 token from jwt.
 * @param {string} kind either "access" or "refresh";
 */
export const verifyToken = (token, kind = 'access') => {
	const key = readFileSync(join(process.cwd(), `/keys/${kind}.public.pem`));

	const { id, version } = verify(token, key, {
		algorithm: 'ES256',
		ignoreExpiration: false,
	});

	return { id, version };
};

export const hasSession = (req, res, next) => {
	const { lemon_qid: token } = req.cookies;

	if (!token) {
		return res.status(401).json([
			{
				code: 'session_expired',
				message:
					'You session has expired. Automatic renewal should happen automatically.',
			},
		]);
	}

	try {
		req.session_payload = verifyToken(token);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(error);

		return res.status(401).json([
			{
				code: 'session_expired',
				message: 'Bad token.',
				details: error.message,
			},
		]);
	}

	next();
};
