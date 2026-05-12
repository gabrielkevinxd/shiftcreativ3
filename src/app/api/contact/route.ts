import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function POST(req: Request) {
  try {
    const { nome, email, empresa, tipo, mensagem } = await req.json();

    if (!nome || !email || !tipo || !mensagem) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: 'Shift Creativ3 <noreply@shiftcreativ3.com>',
      to: ['geral@shiftcreativ3.com'],
      replyTo: email,
      subject: `Orçamento — ${tipo} — ${nome}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0f;color:#e8e8f0;padding:32px;border-radius:12px">
          <div style="border-bottom:2px solid #47f1e4;padding-bottom:16px;margin-bottom:24px">
            <h2 style="margin:0;color:#47f1e4;font-size:22px">Novo pedido de orçamento</h2>
            <p style="margin:4px 0 0;color:#9898a8;font-size:14px">Shift Creativ3 — Formulário de Contacto</p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:15px">
            <tr>
              <td style="padding:10px 12px;font-weight:bold;color:#47f1e4;width:110px">Nome</td>
              <td style="padding:10px 12px">${esc(nome)}</td>
            </tr>
            <tr style="background:#1b1b20">
              <td style="padding:10px 12px;font-weight:bold;color:#47f1e4">Email</td>
              <td style="padding:10px 12px"><a href="mailto:${esc(email)}" style="color:#47f1e4">${esc(email)}</a></td>
            </tr>
            <tr>
              <td style="padding:10px 12px;font-weight:bold;color:#47f1e4">Empresa</td>
              <td style="padding:10px 12px">${esc(empresa || '—')}</td>
            </tr>
            <tr style="background:#1b1b20">
              <td style="padding:10px 12px;font-weight:bold;color:#47f1e4">Tipo</td>
              <td style="padding:10px 12px">${esc(tipo)}</td>
            </tr>
          </table>
          <div style="margin-top:24px;padding:16px;background:#1b1b20;border-radius:8px;border-left:3px solid #47f1e4">
            <p style="margin:0 0 8px;font-weight:bold;color:#47f1e4">Mensagem</p>
            <p style="margin:0;white-space:pre-wrap;line-height:1.6">${esc(mensagem)}</p>
          </div>
          <p style="margin-top:24px;font-size:12px;color:#9898a8;text-align:center">
            Responde directamente a este email para contactar ${esc(nome)}.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'send_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Contact API error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
