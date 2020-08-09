import type * as Discord from "../discord.ts";
import { stringifyQueryParams as stringify, URLs } from "../utils.ts";
import { DiscordJSONError, HTTPError } from "./Error.ts";

/**
 * a client to make HTTP requests to Discord
 * NOTE: there are no explanations what each of the methods do as they are identical to Discord's endpoints
 * */
export class RestClient {
  /** the token to make requests with */
  token: string;

  constructor(token?: string) {
    this.token = token ?? "";
  }

  private async request(
    endpoint: string,
    method: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE"),
    data?: any,
  ): Promise<unknown> {
    const headers = new Headers({
      "User-Agent": "DiscordBot (https://github.com/DenordTS/denord, 0.0.1)",
    });

    if (this.token) {
      headers.append("Authorization", "Bot " + this.token);
    }

    let body;

    if (data !== undefined) {
      if (data.file) {
        let { file, ...otherData } = data;

        data = new FormData();
        data.append("file", file, file.name);
        data.append("payload_json", otherData);
      }

      if (data instanceof FormData) {
        body = data;
      } else {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(data);
      }
    }

    const res = await fetch(URLs.REST + endpoint, {
      method,
      headers,
      body,
    });

    switch (res.status) {
      case 200:
      case 201:
        return await res.json();

      case 204:
        return;

      case 400:
      case 404:
        throw new DiscordJSONError(res.status, await res.json());

      case 401:
        throw new HTTPError(res.status, "You supplied an invalid token");

      case 403:
        throw new HTTPError(res.status, "You don't have permission to do this");

      case 429:
        throw new HTTPError(res.status, "You are getting rate-limited");

      case 502:
        throw new HTTPError(res.status, "Gateway unavailable. Wait and retry");

      case 500:
      case 503:
      case 504:
      case 507:
      case 508:
        throw new HTTPError(res.status, "Discord internal error");

      default:
        throw new HTTPError(res.status, "Unexpected response");
    }
  }

  //region Audit Log
  async getGuildAuditLog(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/audit-logs`,
      "GET",
    ) as Discord.auditLog.AuditLog;
  }

  //endregion

  //region Channel
  async getChannel(channelId: Discord.Snowflake) {
    return await this.request(
      `channels/${channelId}`,
      "GET",
    ) as Discord.channel.Channel;
  }

  async modifyChannel(
    channelId: Discord.Snowflake,
    data: Discord.channel.Modify,
  ) {
    return await this.request(
      `channels/${channelId}`,
      "PATCH",
      data,
    ) as Discord.channel.Channel;
  }

  async deleteChannel(channelId: Discord.Snowflake) {
    return await this.request(
      `channels/${channelId}`,
      "DELETE",
    ) as Discord.channel.Channel;
  }

  async getChannelMessages(
    channelId: Discord.Snowflake,
    params: Discord.channel.GetMessages,
  ) {
    return await this.request(
      `channels/${channelId}/messages${stringify(params)}`,
      "GET",
    ) as Discord.message.Message[];
  }

  async getChannelMessage(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
  ) {
    return await this.request(
      `channels/${channelId}/messages/${messageId}`,
      "GET",
    ) as Discord.message.Message;
  }

  async createMessage(
    channelId: Discord.Snowflake,
    data: Discord.message.Create,
  ) {
    return await this.request(
      `channels/${channelId}/messages`,
      "POST",
      data,
    ) as Discord.message.Message;
  }

  async createReaction(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
    emoji: string,
  ) {
    await this.request(
      `channels/${channelId}/messages/${messageId}/reactions/${emoji}/@me`,
      "PUT",
    );
  }

  async deleteOwnReaction(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
    emoji: string,
  ) {
    await this.request(
      `channels/${channelId}/messages/${messageId}/reactions/${emoji}/@me`,
      "DELETE",
    );
  }

  async deleteUserReaction(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
    emoji: string,
    userId: Discord.Snowflake,
  ) {
    await this.request(
      `channels/${channelId}/messages/${messageId}/${emoji}/reactions/${userId}`,
      "DELETE",
    );
  }

  async getReactions(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
    emoji: string,
    params: Discord.channel.GetReactions,
  ) {
    return await this.request(
      `channels/${channelId}/messages/${messageId}/reactions/${emoji}${
        stringify(params)
      }`,
      "GET",
    ) as Discord.user.User[];
  }

  async deleteAllReactions(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
  ) {
    await this.request(
      `channels/${channelId}/messages/${messageId}/reactions`,
      "DELETE",
    );
  }

  async deleteAllReactionsForEmoji(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
    emoji: string,
  ) {
    await this.request(
      `channels/${channelId}/messages/${messageId}/reactions/${emoji}`,
      "DELETE",
    );
  }

  async editMessage(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
    data: Discord.message.Edit,
  ) {
    return await this.request(
      `channels/${channelId}/messages/${messageId}`,
      "PATCH",
      data,
    ) as Discord.message.Message;
  }

  async deleteMessage(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
  ) {
    await this.request(`channels/${channelId}/messages/${messageId}`, "DELETE");
  }

  async bulkDeleteMessages(
    channelId: Discord.Snowflake,
    data: Discord.channel.BulkDelete,
  ) {
    await this.request(
      `channels/${channelId}/messages/bulk-delete`,
      "POST",
      data,
    );
  }

  async editChannelPermissions(
    channelId: Discord.Snowflake,
    overwriteId: Discord.Snowflake,
    data: Omit<Discord.channel.Overwrite, "id">,
  ) {
    await this.request(
      `channels/${channelId}/permissions/${overwriteId}`,
      "PUT",
      data,
    );
  }

  async getChannelInvites(channelId: Discord.Snowflake) {
    return await this.request(
      `channels/${channelId}/invites`,
      "GET",
    ) as Discord.invite.Invite[];
  }

  async createChannelInvite(
    channelId: Discord.Snowflake,
    data: Discord.invite.Create,
  ) {
    return await this.request(
      `channels/${channelId}/invites`,
      "POST",
      data,
    ) as Discord.invite.Invite;
  }

  async deleteChannelPermission(
    channelId: Discord.Snowflake,
    overwriteId: Discord.Snowflake,
  ) {
    await this.request(
      `channels/${channelId}/permissions/${overwriteId}`,
      "DELETE",
    );
  }

  async triggerTypingIndicator(channelId: Discord.Snowflake) {
    await this.request(`channels/${channelId}/typing`, "POST");
  }

  async getPinnedMessages(channelId: Discord.Snowflake) {
    return await this.request(
      `channels/${channelId}/pins`,
      "GET",
    ) as Discord.message.Message[];
  }

  async addPinnedChannelMessage(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
  ) {
    await this.request(`channels/${channelId}/pins/${messageId}`, "PUT");
  }

  async deletePinnedChannelMessage(
    channelId: Discord.Snowflake,
    messageId: Discord.Snowflake,
  ) {
    await this.request(`channels/${channelId}/pins/${messageId}`, "DELETE");
  }

  async groupDMAddRecipient(
    channelId: Discord.Snowflake,
    userId: Discord.Snowflake,
    data: Discord.channel.GroupDMAddRecipient,
  ) {
    await this.request(
      `channels/${channelId}/recipients/${userId}`,
      "PUT",
      data,
    );
  }

  async groupDMRemoveRecipient(
    channelId: Discord.Snowflake,
    userId: Discord.Snowflake,
  ) {
    await this.request(`channels/${channelId}/recipients/${userId}`, "DELETE");
  }

  //endregion

  //region Emoji
  async listGuildEmojis(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/emojis`,
      "GET",
    ) as Discord.emoji.Emoji[];
  }

  async getGuildEmoji(guildId: Discord.Snowflake, emojiId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/emojis/${emojiId}`,
      "GET",
    ) as Discord.emoji.Emoji;
  }

  async createGuildEmoji(
    guildId: Discord.Snowflake,
    data: Discord.emoji.Create,
  ) {
    return await this.request(
      `guilds/${guildId}/emojis`,
      "POST",
      data,
    ) as Discord.emoji.Emoji;
  }

  async modifyGuildEmoji(
    guildId: Discord.Snowflake,
    emojiId: Discord.Snowflake,
    data: Discord.emoji.Modify,
  ) {
    return await this.request(
      `guilds/${guildId}/emojis/${emojiId}`,
      "PATCH",
      data,
    ) as Discord.emoji.Emoji;
  }

  async deleteGuildEmoji(
    guildId: Discord.Snowflake,
    emojiId: Discord.Snowflake,
  ) {
    await this.request(`guilds/${guildId}/emojis/${emojiId}`, "DELETE");
  }

  //endregion

  //region Guild
  async createGuild(data: Discord.guild.Create) {
    return await this.request("guilds", "POST", data) as Discord.guild.Guild;
  }

  async getGuild(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}`,
      "GET",
    ) as Discord.guild.Guild;
  }

  async modifyGuild(guildId: Discord.Snowflake, data: Discord.guild.Modify) {
    return await this.request(
      `guilds/${guildId}`,
      "PATCH",
      data,
    ) as Discord.guild.Guild;
  }

  async deleteGuild(guildId: Discord.Snowflake) {
    await this.request(`guilds/${guildId}`, "DELETE");
  }

  async getGuildChannels(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/channels`,
      "GET",
    ) as Discord.channel.Channel[];
  }

  async createGuildChannel(
    guildId: Discord.Snowflake,
    data: Discord.channel.CreateGuildChannel,
  ) {
    return await this.request(
      `guilds/${guildId}/channels`,
      "POST",
      data,
    ) as Discord.channel.Channel;
  }

  async modifyGuildChannelPositions(
    guildId: Discord.Snowflake,
    data: Discord.channel.GuildPosition,
  ) {
    return await this.request(
      `guilds/${guildId}/channels`,
      "PATCH",
      data,
    ) as Discord.channel.Channel[];
  }

  async getGuildMember(guildId: Discord.Snowflake, userId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/members/${userId}`,
      "GET",
    ) as Discord.guildMember.GuildMember;
  }

  async listGuildMembers(
    guildId: Discord.Snowflake,
    params: Discord.guildMember.List,
  ) {
    return await this.request(
      `guilds/${guildId}/members${stringify(params)}`,
      "GET",
    ) as Discord.guildMember.GuildMember[];
  }

  async addGuildMember(
    guildId: Discord.Snowflake,
    userId: Discord.Snowflake,
    data: Discord.guildMember.Add,
  ) {
    return await this.request(
      `guilds/${guildId}/members/${userId}`,
      "PUT",
      data,
    ) as Discord.guildMember.GuildMember;
  }

  async modifyGuildMember(
    guildId: Discord.Snowflake,
    userId: Discord.Snowflake,
    data: Discord.guildMember.Modify,
  ) {
    return await this.request(
      `guilds/${guildId}/members/${userId}`,
      "PATCH",
      data,
    ) as Discord.guildMember.GuildMember;
  }

  async modifyCurrentUserNick(
    guildId: Discord.Snowflake,
    userId: Discord.Snowflake,
    data: Discord.guildMember.ModifyCurrentNick,
  ) {
    return await this.request(
      `guilds/${guildId}/members/@me/nick`,
      "PATCH",
      data,
    ) as Discord.guildMember.GuildMember;
  }

  async addGuildMemberRole(
    guildId: Discord.Snowflake,
    userId: Discord.Snowflake,
    roleId: Discord.Snowflake,
  ) {
    await this.request(
      `guilds/${guildId}/members/${userId}/roles/${roleId}`,
      "PUT",
    );
  }

  async removeGuildMemberRole(
    guildId: Discord.Snowflake,
    userId: Discord.Snowflake,
    roleId: Discord.Snowflake,
  ) {
    await this.request(
      `guilds/${guildId}/members/${userId}/roles/${roleId}`,
      "DELETE",
    );
  }

  async removeGuildMember(
    guildId: Discord.Snowflake,
    userId: Discord.Snowflake,
  ) {
    await this.request(`guilds/${guildId}/members/${userId}`, "DELETE");
  }

  async getGuildBans(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/bans`,
      "GET",
    ) as Discord.guild.Ban[];
  }

  async getGuildBan(guildId: Discord.Snowflake, userId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/bans/${userId}`,
      "GET",
    ) as Discord.guild.Ban;
  }

  async createGuildBan(
    guildId: Discord.Snowflake,
    userId: Discord.Snowflake,
    params: Discord.guild.CreateBan,
  ) {
    await this.request(
      `guilds/${guildId}/bans/${userId}${stringify(params)}`,
      "PUT",
    );
  }

  async removeGuildBan(guildId: Discord.Snowflake, userId: Discord.Snowflake) {
    await this.request(`guilds/${guildId}/bans/${userId}`, "DELETE");
  }

  async getGuildRoles(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/roles`,
      "GET",
    ) as Discord.role.Role[];
  }

  async createGuildRole(guildId: Discord.Snowflake, data: Discord.role.Create) {
    return await this.request(
      `guilds/${guildId}/roles`,
      "POST",
      data,
    ) as Discord.role.Role;
  }

  async modifyGuildRolePositions(
    guildId: Discord.Snowflake,
    data: Discord.role.ModifyPosition,
  ) {
    return await this.request(
      `guilds/${guildId}/roles`,
      "PATCH",
      data,
    ) as Discord.role.Role[];
  }

  async modifyGuildRole(guildId: Discord.Snowflake, data: Discord.role.Modify) {
    return await this.request(
      `guilds/${guildId}/roles`,
      "PATCH",
      data,
    ) as Discord.role.Role;
  }

  async deleteGuildRole(guildId: Discord.Snowflake, roleId: Discord.Snowflake) {
    await this.request(`guilds/${guildId}/roles/${roleId}`, "DELETE");
  }

  async getGuildPruneCount(
    guildId: Discord.Snowflake,
    params: Discord.guild.PruneCount,
  ) {
    await this.request(`guilds/${guildId}/prune${stringify(params)}`, "GET");
  }

  async beginGuildPrune(
    guildId: Discord.Snowflake,
    params: Discord.guild.BeginPruneParams,
  ) {
    return await this.request(
      `guilds/${guildId}/prune${stringify(params)}`,
      "POST",
    ) as Discord.guild.BeginPrune;
  }

  async getGuildVoiceRegions(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/regions`,
      "GET",
    ) as Discord.voice.Region[];
  }

  async getGuildInvites(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/invites`,
      "GET",
    ) as Discord.invite.MetadataInvite;
  }

  async getGuildIntegrations(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/integrations`,
      "GET",
    ) as Discord.integration.Integration[];
  }

  async createGuildIntegration(
    guildId: Discord.Snowflake,
    data: Discord.integration.Create,
  ) {
    await this.request(`guilds/${guildId}/integrations`, "POST", data);
  }

  async modifyGuildIntegration(
    guildId: Discord.Snowflake,
    integrationId: Discord.Snowflake,
    data: Discord.integration.Modify,
  ) {
    await this.request(
      `guilds/${guildId}/integrations/${integrationId}`,
      "PATCH",
      data,
    );
  }

  async deleteGuildIntegration(
    guildId: Discord.Snowflake,
    integrationId: Discord.Snowflake,
  ) {
    await this.request(
      `guilds/${guildId}/integrations/${integrationId}`,
      "DELETE",
    );
  }

  async syncGuildIntegration(
    guildId: Discord.Snowflake,
    integrationId: Discord.Snowflake,
  ) {
    await this.request(
      `guilds/${guildId}/integrations/${integrationId}/sync`,
      "POST",
    );
  }

  async getGuildEmbed(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/embed`,
      "GET",
    ) as Discord.guild.Embed;
  }

  async modifyGuildEmbed(
    guildId: Discord.Snowflake,
    data: Discord.guild.EmbedModify,
  ) {
    return await this.request(
      `guilds/${guildId}/embed`,
      "PATCH",
      data,
    ) as Discord.guild.Embed;
  }

  async getGuildVanityURL(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/vanity-url`,
      "GET",
    ) as Discord.invite.VanityURL;
  }

  async getGuildWidgetImage(
    guildId: Discord.Snowflake,
    params: Discord.guild.WidgetEmbedStyle,
  ) {
    return await this.request(
      `guilds/${guildId}/widget.png${stringify(params)}`,
      "GET",
    );
  }

  async getGuildEmbedImage(
    guildId: Discord.Snowflake,
    params: Discord.guild.WidgetEmbedStyle,
  ) {
    return await this.request(
      `guilds/${guildId}/embed.png${stringify(params)}`,
      "GET",
    );
  }

  //endregion

  //region Invite
  async getInvite(inviteCode: string) {
    return await this.request(
      `invites/${inviteCode}`,
      "GET",
    ) as Discord.invite.Invite;
  }

  async deleteInvite(inviteCode: string) {
    return await this.request(
      `invites/${inviteCode}`,
      "DELETE",
    ) as Discord.invite.Invite;
  }

  //endregion

  //region User
  async getCurrentUser() {
    return await this.request("users/@me", "GET") as Discord.user.User;
  }

  async getUser(userId: Discord.Snowflake) {
    return await this.request(`users/${userId}`, "GET") as Discord.user.User;
  }

  async modifyCurrentUser(data: Discord.user.Modify) {
    return await this.request("users/@me", "PATCH", data) as Discord.user.User;
  }

  async getCurrentUserGuilds(params: Discord.user.GetGuilds) {
    return await this.request(
      `users/@me/guilds${stringify(params)}`,
      "GET",
    ) as Discord.guild.Guild[];
  }

  async leaveGuild(guildId: Discord.Snowflake) {
    await this.request(`users/@me/guilds/${guildId}`, "DELETE");
  }

  async getUserDMs() {
    return await this.request(
      "users/@me/channels",
      "GET",
    ) as Discord.channel.Channel[];
  }

  async createDM(data: Discord.channel.CreateDM) {
    return await this.request(
      "users/@me/channels",
      "POST",
      data,
    ) as Discord.channel.Channel;
  }

  async createGroupDM(data: Discord.channel.CreateGroupDM) {
    return await this.request(
      "users/@me/channels",
      "POST",
      data,
    ) as Discord.channel.Channel;
  }

  async getUserConnections() {
    return await this.request(
      "users/@me/connections",
      "GET",
    ) as Discord.user.Connection[];
  }

  //endregion

  //region Voice
  async listVoiceRegions() {
    return await this.request("voice/regions", "GET") as Discord.voice.Region[];
  }

  //endregion

  //region Webhook
  async createWebhook(
    channelId: Discord.Snowflake,
    data: Discord.webhook.Create,
  ) {
    return await this.request(
      `channels/${channelId}/webhooks`,
      "POST",
      data,
    ) as Discord.webhook.Webhook;
  }

  async getChannelWebhooks(channelId: Discord.Snowflake) {
    return await this.request(
      `channels/${channelId}/webhooks`,
      "GET",
    ) as Discord.webhook.Webhook[];
  }

  async getGuildWebhooks(guildId: Discord.Snowflake) {
    return await this.request(
      `guilds/${guildId}/webhooks`,
      "GET",
    ) as Discord.webhook.Webhook[];
  }

  async getWebhook(webhookId: Discord.Snowflake) {
    return await this.request(
      `webhooks/${webhookId}`,
      "GET",
    ) as Discord.webhook.Webhook;
  }

  async getWebhookWithToken(
    webhookId: Discord.Snowflake,
    webhookToken: string,
  ) {
    return await this.request(
      `webhooks/${webhookId}/${webhookToken}`,
      "GET",
    ) as Discord.webhook.Webhook;
  }

  async modifyWebhook(
    webhookId: Discord.Snowflake,
    data: Discord.webhook.Modify,
  ) {
    return await this.request(
      `webhooks/${webhookId}`,
      "PATCH",
      data,
    ) as Discord.webhook.Webhook;
  }

  async modifyWebhookWithToken(
    webhookId: Discord.Snowflake,
    webhookToken: string,
    data: Discord.webhook.Modify,
  ) {
    return await this.request(
      `webhooks/${webhookId}/${webhookToken}`,
      "PATCH",
      data,
    ) as Discord.webhook.Webhook;
  }

  async deleteWebhook(webhookId: Discord.Snowflake) {
    await this.request(`webhooks/${webhookId}`, "DELETE");
  }

  async deleteWebhookWithToken(
    webhookId: Discord.Snowflake,
    webhookToken: string,
  ) {
    await this.request(`webhooks/${webhookId}/${webhookToken}`, "DELETE");
  }

  async executeWebhook(
    webhookId: Discord.Snowflake,
    webhookToken: string,
    data: Discord.webhook.ExecuteBody,
    params: Discord.webhook.ExecuteParams,
  ) {
    await this.request(
      `webhooks/${webhookId}/${webhookToken}${stringify(params)}`,
      "POST",
      data,
    );
  }

  async executeSlackCompatibleWebhook(
    webhookId: Discord.Snowflake,
    webhookToken: string,
    data: any,
    params: Discord.webhook.ExecuteParams,
  ) {
    await this.request(
      `webhooks/${webhookId}/${webhookToken}/slack${stringify(params)}`,
      "POST",
      data,
    );
  }

  async executeGitHubCompatibleWebhook(
    webhookId: Discord.Snowflake,
    webhookToken: string,
    data: any,
    params: Discord.webhook.ExecuteParams,
  ) {
    await this.request(
      `webhooks/${webhookId}/${webhookToken}/github${stringify(params)}`,
      "POST",
      data,
    );
  }

  //endregion

  //region Gateway
  async getGateway() {
    return await this.request("gateway", "GET") as Discord.gateway.Gateway;
  }

  async getGatewayBot() {
    return await this.request(
      "gateway/bot",
      "GET",
    ) as Discord.gateway.GatewayBot;
  }

  //endregion
}