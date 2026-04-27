FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

# Xóa thư mục .next nếu có (tránh lỗi cache)
RUN rm -rf .next

EXPOSE 3000

CMD ["npm", "run", "dev"]
