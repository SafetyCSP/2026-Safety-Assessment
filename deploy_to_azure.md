# Deploying AI Safety Tool to Microsoft Azure

This guide walks you through deploying your containerized AI application to Azure App Service.

## Prerequisites
1.  **Azure CLI**: [Install Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2.  **Docker Desktop**: Ensure Docker is installed and running.

## Step 1: Login to Azure
Open your terminal (PowerShell or Command Prompt) and run:
```bash
az login
```
Follow the browser prompts to authenticate.

## Step 2: Create a Resource Group
Create a group to hold your resources (replace `EastUS` with your preferred region):
```bash
az group create --name AISafetyGroup --location EastUS
```

## Step 3: Create an Azure Container Registry (ACR)
You need a place to store your Docker image.
```bash
az acr create --resource-group AISafetyGroup --name aisafetyregistry<unique_number> --sku Basic
```
*Note: Replace `<unique_number>` with random digits (e.g., `aisafetyregistry5521`) because the name must be globally unique.*

Log in to the registry:
```bash
az acr login --name aisafetyregistry<unique_number>
```

## Step 4: Build and Push the Image
Build the Docker image. Run this in the project root folder:
```bash
docker build -t aisafetyregistry<unique_number>.azurecr.io/ai-safety-tool:latest .
```

Push the image to Azure:
```bash
docker push aisafetyregistry<unique_number>.azurecr.io/ai-safety-tool:latest
```

## Step 5: Create the App Service
Create the web app plan (server) and the app itself.

1.  **Create Plan**:
    ```bash
    az appservice plan create --name AISafetyPlan --resource-group AISafetyGroup --sku B1 --is-linux
    ```

2.  **Create Web App**:
    ```bash
    az webapp create --resource-group AISafetyGroup --plan AISafetyPlan --name ai-safety-tool-<unique_number> --deployment-container-image-name aisafetyregistry<unique_number>.azurecr.io/ai-safety-tool:latest
    ```

## Step 6: Configure Environment Variables
You must set your Gemini API Key in the cloud environment:
```bash
az webapp config appsettings set --resource-group AISafetyGroup --name ai-safety-tool-<unique_number> --settings GOOGLE_GENERATIVE_AI_API_KEY="your_actual_api_key_here"
```

## Step 7: Enable Container Access (Important)
Allow the App Service to pull images from your registry:
```bash
az webapp config container set --name ai-safety-tool-<unique_number> --resource-group AISafetyGroup --docker-custom-image-name aisafetyregistry<unique_number>.azurecr.io/ai-safety-tool:latest --docker-registry-server-url https://aisafetyregistry<unique_number>.azurecr.io
```
*(Note: You may need to enable "Admin User" on the ACR to get a username/password if authentication fails, but often `az webapp create` handles the identity logic automatically if you are the owner).*

## Verification
Visit `https://ai-safety-tool-<unique_number>.azurewebsites.net` in your browser.
Your AI Safety Tool should now be live!
