FROM python:3.10
 
RUN mkdir core
COPY . /core/
WORKDIR /core
 
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y curl && \
    apt-get clean
 

RUN pip install --upgrade pip

RUN pip install -r requirements.txt
RUN pip install uvicorn gunicorn

RUN mkdir static
RUN python manage.py collectstatic --no-input
ENV DJANGO_SETTINGS_MODULE "cubarimoe.settings.prod"

EXPOSE 8000

CMD ["gunicorn","--bind", ":8000", "cubarimoe.asgi:application", "-w", "4", "-k", "uvicorn.workers.UvicornWorker"]