# ThreadMail Discord Bot

A Discord bot that enables seamless ticket creation and management between users and server administrators through private threads. Built with mini-interaction framework for optimal performance and reliability.

## ✨ Features

-   **Ticket Creation**: Users can create support tickets from any server the bot is in
-   **Private Threads**: All tickets are created as private Discord threads for secure communication
-   **Staff Management**: Server admins can assign staff roles for ticket notifications
-   **Channel Control**: Customizable ticket creation channels per server
-   **OAuth Integration**: Secure Discord OAuth2 for user authentication
-   **Database Storage**: MongoDB integration for persistent data storage
-   **Real-time Updates**: Instant notifications and thread management

## 🚀 Quick Start

### Prerequisites

-   Node.js 18+
-   MongoDB database
-   Discord Application with bot token
-   Vercel account (for deployment)

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/neodevils/thread-mail-discord.git
    cd thread-mail-discord
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Environment Setup**

    ```bash
    cp .env.example .env
    ```

    Fill in your environment variables:

    ```env
    DISCORD_APPLICATION_ID=your_app_id
    DISCORD_BOT_TOKEN=your_bot_token
    DISCORD_PUBLIC_KEY=your_public_key
    DISCORD_REDIRECT_URI=your_redirect_uri
    DATABASE_TYPE=mongodb
    MONGODB_URI=your_mongodb_connection_string
    ```

## 🛠️ Development

### Local Development

1. **Register Discord commands**

    ```bash
    npm run build
    ```

2. **Start development server**
    ```bash
    npm run production
    ```

### Commands

ThreadMail includes the following Discord slash commands:

-   `/create` - Create a new support ticket
-   `/send` - Send messages in active tickets
-   `/close` - Close and archive tickets
-   `/manage` - Server administration settings

## 📦 Deployment

### Vercel Deployment

1. **Install Vercel CLI**

    ```bash
    npm install -g vercel
    ```

2. **Login and link project**

    ```bash
    vercel login
    vercel link
    ```

3. **Deploy**
    ```bash
    vercel --prod
    ```

### Environment Variables

Set these in your Vercel dashboard or `.env` file:

| Variable                 | Description                             | Required |
| ------------------------ | --------------------------------------- | -------- |
| `DISCORD_APPLICATION_ID` | Your Discord application ID             | ✅       |
| `DISCORD_BOT_TOKEN`      | Bot token from Discord Developer Portal | ✅       |
| `DISCORD_PUBLIC_KEY`     | Public key for Discord interactions     | ✅       |
| `DISCORD_REDIRECT_URI`   | OAuth2 redirect URI                     | ✅       |
| `MONGODB_URI`            | MongoDB connection string               | ✅       |
| `DATABASE_TYPE`          | Database type (mongodb)                 | ✅       |

## 🤖 Bot Setup

1. **Create Discord Application**

    - Go to [Discord Developer Portal](https://discord.com/developers/applications)
    - Create a new application
    - Copy Application ID, Public Key, and generate Bot Token

2. **Bot Permissions**

    - `Send Messages`
    - `Use Slash Commands`
    - `Create Private Threads`
    - `Manage Threads`
    - `Read Message History`

3. **Invite Bot**
    ```
    https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&permissions=268435456&scope=bot%20applications.commands
    ```

## 📋 Usage

### For Server Administrators

1. **Invite the bot** to your server
2. **Set staff role** (optional): `/manage staff set @role`
3. **Set custom channel** (optional): `/manage channel set #channel`
4. **View settings**: `/manage staff view` or `/manage channel view`

### For Users

1. **Authorize**: Visit the OAuth URL or use `/authorize-account`
2. **Create ticket**: Use `/create` and select target server
3. **Send messages**: Use `/send` command in DMs
4. **Close ticket**: Use `/close` when done

## 📜 Legal

-   **[Terms of Service](TOS.md)** - User agreements and responsibilities
-   **[Privacy Policy](PRIVACY.md)** - Data collection and privacy practices

## 🐛 Troubleshooting

### Common Issues

-   **Bot not responding**: Check bot permissions and ensure it's online
-   **Ticket creation fails**: Verify bot has "Create Private Threads" permission
-   **Database errors**: Check MongoDB connection and credentials
-   **OAuth issues**: Verify redirect URI matches your domain

### Debug Mode

Set `NODE_ENV=development` for additional logging (not recommended for production).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

-   **Issues**: [GitHub Issues](https://github.com/neodevils/thread-mail-discord/issues)
-   **Documentation**: This README and inline code comments
-   **Community**: Discord support channels

---

**Built with ❤️ using [mini-interaction](https://github.com/minesa-org/mini-interaction)**
