import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateUserSchema, LoginSchema } from '../models/User.js';
import { userService } from '../services/UserService.js';

function getFriendlyMessage(error: any): string {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (Array.isArray(error?.issues) && error.issues.length > 0) {
    const firstIssue = error.issues[0];
    if (typeof firstIssue?.message === 'string' && firstIssue.message.trim()) {
      return firstIssue.message;
    }
  }

  return 'Dados inválidos.';
}

export async function register(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = CreateUserSchema.parse(request.body);
    const user = await userService.createUser(data);

    const token = request.server.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    reply.code(201).send({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token,
    });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.includes('Email já cadastrado')) {
      reply.code(400).send({ error: error.message });
    } else if (error?.issues) {
      reply.code(400).send({ error: getFriendlyMessage(error) });
    } else {
      reply.code(500).send({ error: 'Erro ao registrar usuário' });
    }
  }
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password } = LoginSchema.parse(request.body);
    const user = await userService.getUserByEmail(email);

    if (!user) {
      reply.code(401).send({ error: 'Email ou senha incorretos' });
      return;
    }

    const passwordValid = await userService.verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      reply.code(401).send({ error: 'Email ou senha incorretos' });
      return;
    }

    const token = request.server.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token,
    });
  } catch (error: any) {
    if (error?.issues) {
      reply.code(400).send({ error: getFriendlyMessage(error) });
    } else {
      reply.code(500).send({ error: 'Erro ao fazer login' });
    }
  }
}

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = await userService.getUserById((request.user as { id?: string } | undefined)?.id ?? '');

    if (!user) {
      reply.code(404).send({ error: 'Usuário não encontrado' });
      return;
    }

    reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar perfil' });
  }
}
