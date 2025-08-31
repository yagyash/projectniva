pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "https://registry-1.docker.io/v1/"
        BACKEND_IMAGE = "yagya123/backend"
        FRONTEND_IMAGE   = "yagya123/frontend"
        BACKEND_TAG   = "v1"
        FRONTEND_TAG     = "v1"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/yagyash/projectniva.git'
            }
        }

        stage('Build & Push backend Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'gitlab-docker-creds',
                                                 usernameVariable: 'DOCKER_USER',
                                                 passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                      echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                      cd backend
                      docker build -t $BACKEND_IMAGE:$BACKEND_TAG .
                      docker push $BACKEND_IMAGE:$BACKEND_TAG
                    """
                }
            }
        }

        stage('Build & Push WebApp Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'gitlab-docker-creds',
                                                 usernameVariable: 'DOCKER_USER',
                                                 passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                      echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                      cd frontend
                      docker build -t $FRONTEND_IMAGE:$FRONTEND_TAG .
                      docker push $FRONTEND_IMAGE:$FRONTEND_TAG
                    """
                }
            }
        }

     }
}
