import { App as SlackApp, ExpressReceiver } from '@slack/bolt';
import type { Express } from 'express';
import { decide } from './llmMediator.js';

type SlackScenario = {
  id: string;
  participants: { name: string }[];
  background_log_entries: unknown[];
  activity_signals: unknown[];
};

type SlackTurn = { speaker: string; message: string };

function selectScenario(scenarios: SlackScenario[]) {
  const requested = process.env.SLACK_SCENARIO_ID;
  return scenarios.find((scenario) => scenario.id === requested) || scenarios[0];
}

/** Mount Slack's signed Events API endpoint on the existing Express server. */
export function installSlackIntegration(expressApp: Express, scenarios: SlackScenario[]) {
  const token = process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const scenario = selectScenario(scenarios);

  if (!token || !signingSecret || !scenario) {
    return { enabled: false, endpoint: '/slack/events' };
  }

  const receiver = new ExpressReceiver({ signingSecret, endpoints: '/slack/events' });
  const slack = new SlackApp({ token, receiver });
  const histories = new Map<string, SlackTurn[]>();

  slack.message(async ({ message, say, logger }) => {
    const event = message as any;
    // Ignore bot posts, edits, joins, and other non-human message variants.
    if (event.bot_id || event.subtype || !event.text || !event.channel) return;

    // Replies share their thread; top-level channel/DM messages share that conversation.
    const conversationId = [event.team || 'workspace', event.channel, event.thread_ts || 'channel'].join(':');
    const history = histories.get(conversationId) || [];
    history.push({ speaker: event.user || 'Slack participant', message: event.text.trim() });
    histories.set(conversationId, history.slice(-30));

    try {
      const decision = await decide(scenario, history);
      if (decision.should_intervene && decision.message) {
        await say({
          text: `✦ *Third Voice:* ${decision.message}`,
          thread_ts: event.thread_ts || event.ts,
        });
      }
    } catch (error) {
      // A Slack conversation must never be interrupted by a mediator failure.
      logger.error(error);
    }
  });

  // This must run before Express's JSON body parser so Bolt receives the raw body.
  expressApp.use(receiver.app);
  return { enabled: true, endpoint: '/slack/events', scenarioId: scenario.id };
}
