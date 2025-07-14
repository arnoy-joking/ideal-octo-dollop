'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { getUsersAction, deleteUserAction } from '@/app/actions/user-actions';
import { useUser } from '@/context/user-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Compass, UserPlus, Loader2, Trash2 } from 'lucide-react';
import { AddUserDialog } from '@/components/dashboard/add-user-dialog';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"

export default function LoginPage() {
    const { setCurrentUser, currentUser, users, setUsers, isInitialLoading } = useUser();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchUsers = async () => {
        const fetchedUsers = await getUsersAction();
        setUsers(fetchedUsers);
    };

    useEffect(() => {
        if (!isInitialLoading) {
            if (currentUser) {
                router.push('/dashboard');
            } else {
                fetchUsers();
            }
        }
    }, [currentUser, isInitialLoading, router]);

    const handleSelectUser = (user: User) => {
        setCurrentUser(user);
        router.push('/dashboard');
    };

    const handleDeleteUser = async (user: User) => {
        setIsDeleting(user.id);
        const result = await deleteUserAction(user.id);

        if (result.success) {
            toast({ title: "Success", description: `Profile "${user.name}" deleted.` });
            if (currentUser?.id === user.id) {
                setCurrentUser(null);
            }
            fetchUsers();
        } else {
            toast({ title: "Error", description: result.message || "Failed to delete profile.", variant: "destructive" });
        }
        setIsDeleting(null);
    };

    if (isInitialLoading || currentUser) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                 <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <Compass className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="mt-4 text-2xl font-bold">
                        Select a Profile
                    </CardTitle>
                    <CardDescription>
                       Choose your profile to continue or add a new one.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[40vh] overflow-y-auto">
                    {users.length > 0 ? (
                        users.map((user) => (
                            <div key={user.id} className="w-full flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                                <button
                                    onClick={() => handleSelectUser(user)}
                                    className="flex-1 flex items-center gap-4 p-2"
                                >
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="font-semibold text-lg">{user.name}</div>
                                </button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" disabled={isDeleting === user.id}>
                                            {isDeleting === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the profile for "{user.name}" and all of their course progress.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              onClick={() => handleDeleteUser(user)}
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-4">No profiles found. Please add one to get started.</p>
                    )}
                </CardContent>
                <CardFooter>
                    <AddUserDialog onUserAdded={fetchUsers}>
                        <Button variant="outline" className="w-full">
                            <UserPlus className="mr-2" />
                            Add New Profile
                        </Button>
                    </AddUserDialog>
                </CardFooter>
            </Card>
        </div>
    );
}
