# Deploying Sonic AI to AWS EC2

This guide walks you through deploying the Sonic AI application (Frontend + Backend) to a single AWS EC2 instance.

## Prerequisites

- An AWS Account.
- Basic familiarity with terminal/command line.

## Step 1: Launch an EC2 Instance

1.  Log in to the AWS Management Console and navigate to **EC2**.
2.  Click **Launch Instances**.
3.  **Name**: `Sonic-AI-Server` (or any name you prefer).
4.  **OS Images**: Select **Ubuntu** (Ubuntu Server 24.04 LTS or 22.04 LTS is recommended).
5.  **Instance Type**: Select **t2.micro** or **t3.micro** (Free Tier eligible).
    > **Note**: These instances have 1GB of RAM. We will configure Swap memory later to ensure the build doesn't crash.
6.  **Key Pair**: Create a new key pair (e.g., `sonic-ai-key`), download the `.pem` file, and **keep it safe**. You will need this to SSH into the server.
7.  **Network Settings**:
    - Check **Allow SSH traffic from**. (Ideally "My IP" for security, or "Anywhere" for easier access).
    - Check **Allow HTTP traffic from the internet**.
    - Check **Allow HTTPS traffic from the internet**.
8.  Click **Launch Instance**.

## Step 2: Configure Security Group

The default security group allows port 22 (SSH), 80 (HTTP), and 443 (HTTPS). We need to open ports for our app (or use a reverse proxy, but for simplicity, we'll open the ports first).

1.  Go to your Instance summary in AWS Console.
2.  Click the **Security** tab, then click the **Security Group** ID.
3.  Click **Edit inbound rules**.
4.  Add Rule:
    - **Type**: Custom TCP
    - **Port range**: `3000` (Frontend)
    - **Source**: `0.0.0.0/0` (Anywhere)
5.  Add Rule:
    - **Type**: Custom TCP
    - **Port range**: `8000` (Backend)
    - **Source**: `0.0.0.0/0` (Anywhere)
6.  Click **Save rules**.

## Step 3: Connect to the Instance

Open your terminal (or Git Bash/PowerShell on Windows).

```bash
# Set permission for your key (Linux/Mac only)
chmod 400 "path/to/sonic-ai-key.pem"

# Connect via SSH
ssh -i "path/to/sonic-ai-key.pem" ubuntu@<YOUR-EC2-PUBLIC-IP>
```

## Step 4: Install Docker & Docker Compose

Run the following commands on the server:

```bash
# Update package list
sudo apt-get update

# Install Docker using the official convenience script (more robust)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group
sudo usermod -aG docker $USER

# Verify
docker compose version
```

**Logout and Log back in** for the group changes to take effect:
`exit` then `ssh ...` again.

## Step 5: Configure Swap Memory (Critical for Free Tier)

Since t2.micro has only 1GB RAM, builds might crash. We'll add 2GB of swap space.

```bash
# Create a swap file
sudo fallocate -l 2G /swapfile

# Set permissions
sudo chmod 600 /swapfile

# Mark the file as swap space
sudo mkswap /swapfile

# Enable the swap file
sudo swapon /swapfile

# Make it permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
sudo free -h
```

## Step 6: Deploy the Code

**Method: Clone from GitHub (Fastest)**

Since `scp` can be slow for large projects, we will use Git.

1.  **Clean up previous attempts** (if any):
    ```bash
    rm -rf ~/sonic-ai
    ```

2.  **Clone the repository:**
    ```bash
    git clone https://github.com/shadabali1627/Sonic-AI.git sonic-ai
    ```
    *(If your repo is private, you will be asked for a username and a Personal Access Token as the password).*

3.  **Create the Environment File**:
    Git does not copy your secrets (`.env`), so we must create it manually or copy it.

    **Option A: Copy just the .env file (Fast)**
    Run this on your **LOCAL** computer (not the server):
    ```powershell
    scp -i "C:\Users\shada\OneDrive\Documents\sonic-key.pem" "d:\sonic ai\backend\.env" ubuntu@13.222.25.46:~/sonic-ai/backend/.env
    # repeat for frontend if needed, or if one .env is shared verify location
    ```

    **Option B: Create it manually on the server**
    ```bash
    cd ~/sonic-ai
    nano backend/.env
    # Paste your env variables, then Ctrl+O to save, Ctrl+X to exit.
    ```

## Step 7: Environment Configuration

Create the `.env` file in the root directory:

```bash
cd ~/sonic-ai (or wherever your code is)
nano .env
```

Paste your environment variables (from your local `.env`) into this file.
Ctrl+O, Enter to save. Ctrl+X to exit.

## Step 8: Build and Run

```bash
# Build and start containers in the background
docker compose up -d --build
```

This may take a few minutes.

## Step 9: Access the App

- **Frontend**: `http://<EC2-PUBLIC-IP>:3000`
- **Backend**: `http://<EC2-PUBLIC-IP>:8000`

**Note**: You may need to update your frontend `.env` or configuration to point to the correct backend IP instead of `localhost` if the browser is accessing it.
Modify `docker-compose.yml` or frontend config if needed to set `NEXT_PUBLIC_API_URL` to `http://<EC2-PUBLIC-IP>:8000/api/v1`.
