import {Hono} from "hono";
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign, verify } from 'hono/jwt'
import { createBlogInput,updateBlogInput } from "@vj_19/medium-common";


export const blogRouter = new Hono<{
	Bindings: {
		DATABASE_URL: string;
		JWT_SECRET: string;
	},
    Variables:{
        userId: string;
    }
}>();

blogRouter.use('/*', async (c, next) => {
	const header = c.req.header("authorization") || "";
    try{
        const res = await verify(header,c.env.JWT_SECRET);

        if(res.id){
            c.set("userId",res.id);
            await next();
        }
        else{
            c.status(403)
            return c.json({message:"you are not logged in"})
        }
    }
    catch(e){
        c.status(403)
		return c.json({message:"you are not logged in"})
    }
})

blogRouter.post('/', async (c) => {
    const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());
    
    const body = await c.req.json();
    const {success} = createBlogInput.safeParse(body);
	if(!success){
		c.status(411);
		return c.json({message:"Inputs are invaid"})
	}
    const authorId = c.get("userId");
    const post = await prisma.post.create({
        data: {
            title: body.title,
            content: body.content,
            authorId: authorId
        }
    });

	return c.json({
        id:post.id
    })
})

blogRouter.put('/', async(c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());
    
    const body = await c.req.json();
    const {success} = updateBlogInput.safeParse(body);
	if(!success){
		c.status(411);
		return c.json({message:"Inputs are invaid"})
	}
    const post = await prisma.post.update({
        where:{
            id: body.id
        },
        data: {
            title: body.title,
            content: body.content,
        }
    });

	return c.json({
        id:post.id
    })
})

// Todo : add pagination
blogRouter.get('/bulk', async(c) => {
    const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());

    const posts = await prisma.post.findMany({
        select: {
            content: true,
            title: true,
            id: true,
            author: {
                select: {
                    name: true
                }
            }
        }
    });

    return c.json({
        posts
    });
})

blogRouter.get("/:id",async(c) => {
    const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL,
	}).$extends(withAccelerate());
    
    const id = c.req.param("id");
     
    try{
        const post = await prisma.post.findFirst({
        where:{
            id: id
        },
        select: {
            id: true,
            title: true,
            content: true,
            author: {
                select: {
                    name: true
                }
            }
        }
        });

        return c.json({
            post
        });
    }
    catch(e){
        c.status(411);
        return c.json({
            message: "Error while fetching the blog"
        });
    }
})



