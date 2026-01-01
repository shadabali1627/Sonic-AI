# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory to /app
WORKDIR /app

# Install system dependencies (if any needed for your libraries, e.g., gcc for some python packages)
# RUN apt-get update && apt-get install -y gcc

# Copy the requirements file into the container at /app
# We assume the build context is the project root, so we copy backend/requirements.txt
COPY backend/requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
# We copy the backend folder specifically to maintain the package structure 'backend.app...'
COPY backend/ backend/

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Set PYTHONPATH to include the /app directory so imports work correctly
ENV PYTHONPATH=/app

# Run app.py when the container launches
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
